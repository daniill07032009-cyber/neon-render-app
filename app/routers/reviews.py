from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Review, Book, User
from app.schemas import ReviewIn, ReviewOut
from app.deps import get_current_user

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


def review_out(r: Review, user: User) -> ReviewOut:
    return ReviewOut(
        id=r.id, bookId=r.book_id, userId=r.user_id,
        username=user.username, rating=r.rating,
        text=r.text, createdAt=r.created_at,
    )


@router.get("/book/{book_id}")
def book_reviews(book_id: str, db: Session = Depends(get_db)):
    rows = db.query(Review).filter(Review.book_id == book_id).order_by(Review.created_at.desc()).all()
    result = []
    for r in rows:
        user = db.get(User, r.user_id)
        if user:
            result.append(review_out(r, user).model_dump())
    avg = db.query(func.avg(Review.rating)).filter(Review.book_id == book_id).scalar()
    return {
        "reviews": result,
        "average": round(float(avg), 2) if avg else 0,
        "count": len(result),
    }


@router.post("/book/{book_id}")
def create_review(
    book_id: str,
    data: ReviewIn,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Book, book_id):
        raise HTTPException(404, "Книга не найдена")

    existing = db.query(Review).filter(
        Review.book_id == book_id, Review.user_id == me.id
    ).first()
    if existing:
        existing.rating = data.rating
        existing.text = data.text
    else:
        db.add(Review(book_id=book_id, user_id=me.id, rating=data.rating, text=data.text))
    db.commit()
    return {"ok": True}