from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, desc
from app.database import get_db
from app.models import Book, Chapter, User, Review, ReadingProgress
from app.schemas import BookIn, BookOut, BookWithChapters, ChapterOut, ProgressIn, ProgressOut
from app.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/books", tags=["books"])


def book_out(b: Book) -> BookOut:
    return BookOut(
        id=b.id, title=b.title, annotation=b.annotation, genre=b.genre,
        coverUrl=b.cover_url, coverSymbol=b.cover_symbol, status=b.status,
        authorId=b.author_id, authorUsername=b.author.username,
        chaptersCount=len(b.chapters),
        createdAt=b.created_at, updatedAt=b.updated_at,
    )


def book_with_chapters(b: Book) -> BookWithChapters:
    return BookWithChapters(
        **book_out(b).model_dump(),
        chapters=[
            ChapterOut(id=c.id, title=c.title, content=c.content, order=c.order)
            for c in b.chapters
        ],
    )


@router.get("", response_model=list[BookOut])
def list_books(
    q: str | None = None,
    genre: str | None = None,
    sort: str = Query("recent", pattern="^(recent|title|rating)$"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Book)
        .options(joinedload(Book.author), joinedload(Book.chapters))
        .filter(Book.status == "published")
    )
    if genre:
        query = query.filter(Book.genre == genre)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            or_(func.lower(Book.title).like(like), func.lower(Book.annotation).like(like))
        )
    if sort == "title":
        query = query.order_by(Book.title.asc())
    elif sort == "rating":
        query = query.outerjoin(Review).group_by(Book.id).order_by(desc(func.avg(Review.rating)))
    else:
        query = query.order_by(Book.updated_at.desc())
    return [book_out(b) for b in query.limit(100).all()]


@router.post("", response_model=BookWithChapters, status_code=201)
def create_book(
    data: BookIn,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = Book(
        title=data.title,
        annotation=data.annotation,
        genre=data.genre,
        cover_url=data.coverUrl,
        cover_symbol=data.coverSymbol,
        status=data.status,
        author_id=me.id,
    )
    book.chapters = [
        Chapter(title=ch.title, content=ch.content, order=i)
        for i, ch in enumerate(data.chapters)
    ]
    db.add(book)
    db.commit()
    db.refresh(book)
    return book_with_chapters(book)


@router.get("/me", response_model=list[BookOut])
def my_books(me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    books = (
        db.query(Book)
        .options(joinedload(Book.author), joinedload(Book.chapters))
        .filter(Book.author_id == me.id)
        .order_by(Book.updated_at.desc())
        .all()
    )
    return [book_out(b) for b in books]


@router.get("/me/reading", response_model=list[dict])
def my_reading(me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(ReadingProgress, Book)
        .join(Book, Book.id == ReadingProgress.book_id)
        .options(joinedload(Book.author), joinedload(Book.chapters))
        .filter(ReadingProgress.user_id == me.id)
        .order_by(ReadingProgress.updated_at.desc())
        .all()
    )
    return [
        {
            "book": book_out(b).model_dump(),
            "chapterIndex": p.chapter_index,
            "updatedAt": p.updated_at,
        }
        for p, b in rows
    ]


@router.get("/{book_id}", response_model=BookWithChapters)
def get_book(book_id: str, db: Session = Depends(get_db)):
    b = (
        db.query(Book)
        .options(joinedload(Book.author), joinedload(Book.chapters))
        .filter(Book.id == book_id)
        .first()
    )
    if not b:
        raise HTTPException(404, "Книга не найдена")
    return book_with_chapters(b)


@router.put("/{book_id}", response_model=BookWithChapters)
def update_book(
    book_id: str,
    data: BookIn,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = db.get(Book, book_id)
    if not b:
        raise HTTPException(404, "Книга не найдена")
    if b.author_id != me.id:
        raise HTTPException(403, "Это не ваша книга")

    b.title = data.title
    b.annotation = data.annotation
    b.genre = data.genre
    b.cover_url = data.coverUrl
    b.cover_symbol = data.coverSymbol
    b.status = data.status

    b.chapters.clear()
    db.flush()
    b.chapters = [
        Chapter(title=ch.title, content=ch.content, order=i)
        for i, ch in enumerate(data.chapters)
    ]
    db.commit()
    db.refresh(b)
    return book_with_chapters(b)


@router.delete("/{book_id}")
def delete_book(
    book_id: str,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = db.get(Book, book_id)
    if not b:
        raise HTTPException(404, "Книга не найдена")
    if b.author_id != me.id:
        raise HTTPException(403, "Это не ваша книга")
    db.delete(b)
    db.commit()
    return {"ok": True}


@router.post("/{book_id}/progress", response_model=ProgressOut)
def save_progress(
    book_id: str,
    data: ProgressIn,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    book = db.get(Book, book_id)
    if not book:
        raise HTTPException(404, "Книга не найдена")

    p = (
        db.query(ReadingProgress)
        .filter_by(user_id=me.id, book_id=book_id)
        .first()
    )
    if p:
        p.chapter_index = data.chapterIndex
    else:
        p = ReadingProgress(user_id=me.id, book_id=book_id, chapter_index=data.chapterIndex)
        db.add(p)
    db.commit()
    db.refresh(p)
    return ProgressOut(bookId=p.book_id, chapterIndex=p.chapter_index, updatedAt=p.updated_at)