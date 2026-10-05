from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Book
from app.schemas import UserOut, UpdateProfileIn, BookOut, HeartbeatOut
from app.deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/users", tags=["users"])


def user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id, username=u.username, email=u.email,
        displayName=u.display_name, bio=u.bio, avatarUrl=u.avatar_url,
        lastSeen=u.last_seen,
    )


@router.get("", response_model=list[UserOut])
def list_users(
    q: str | None = None,
    _: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            User.username.ilike(like) | User.display_name.ilike(like)
        )
    return [user_out(u) for u in query.limit(200).all()]


@router.post("/heartbeat", response_model=HeartbeatOut)
def heartbeat(
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    me.last_seen = datetime.utcnow()
    db.commit()
    return HeartbeatOut(ok=True)


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "Пользователь не найден")
    return user_out(u)


@router.get("/{user_id}/books", response_model=list[BookOut])
def user_books(user_id: str, db: Session = Depends(get_db)):
    books = db.query(Book).filter(Book.author_id == user_id, Book.status == "published").all()
    return [
        BookOut(
            id=b.id, title=b.title, annotation=b.annotation, genre=b.genre,
            coverUrl=b.cover_url, coverSymbol=b.cover_symbol, status=b.status,
            authorId=b.author_id, authorUsername=b.author.username,
            chaptersCount=len(b.chapters),
            createdAt=b.created_at, updatedAt=b.updated_at,
        )
        for b in books
    ]


@router.patch("/me", response_model=UserOut)
def update_me(
    data: UpdateProfileIn,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.displayName is not None:
        me.display_name = data.displayName
    if data.bio is not None:
        me.bio = data.bio
    if data.avatarUrl is not None:
        me.avatar_url = data.avatarUrl
    db.commit()
    db.refresh(me)
    return user_out(me)
