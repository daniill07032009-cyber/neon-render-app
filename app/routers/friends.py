from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models import User, Friendship
from app.schemas import UserOut, FriendRequestIn
from app.deps import get_current_user
from app.routers.users import user_out

router = APIRouter(prefix="/api/friends", tags=["friends"])


@router.get("", response_model=list[UserOut])
def my_friends(me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Friendship).filter(
        Friendship.status == "accepted",
        or_(Friendship.from_id == me.id, Friendship.to_id == me.id),
    ).all()
    ids = set()
    for r in rows:
        ids.add(r.to_id if r.from_id == me.id else r.from_id)
    if not ids:
        return []
    return [user_out(u) for u in db.query(User).filter(User.id.in_(ids)).all()]


@router.get("/incoming", response_model=list[UserOut])
def incoming(me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Friendship).filter(
        Friendship.status == "pending", Friendship.to_id == me.id
    ).all()
    ids = [r.from_id for r in rows]
    if not ids:
        return []
    return [user_out(u) for u in db.query(User).filter(User.id.in_(ids)).all()]


@router.get("/outgoing", response_model=list[UserOut])
def outgoing(me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Friendship).filter(
        Friendship.status == "pending", Friendship.from_id == me.id
    ).all()
    ids = [r.to_id for r in rows]
    if not ids:
        return []
    return [user_out(u) for u in db.query(User).filter(User.id.in_(ids)).all()]


@router.post("/request")
def send_request(data: FriendRequestIn, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.toUserId == me.id:
        raise HTTPException(400, "Нельзя добавить себя")

    target = db.get(User, data.toUserId)
    if not target:
        raise HTTPException(404, "Пользователь не найден")

    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.from_id == me.id, Friendship.to_id == data.toUserId),
            and_(Friendship.from_id == data.toUserId, Friendship.to_id == me.id),
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            return {"ok": True, "msg": "Уже друзья"}
        if existing.from_id == data.toUserId and existing.status == "pending":
            existing.status = "accepted"
            db.commit()
            return {"ok": True, "msg": "Заявка принята"}
        if existing.from_id == me.id and existing.status == "pending":
            return {"ok": False, "msg": "Заявка уже отправлена"}

    f = Friendship(from_id=me.id, to_id=data.toUserId, status="pending")
    db.add(f)
    db.commit()
    return {"ok": True, "msg": "Заявка отправлена"}


@router.post("/{user_id}/accept")
def accept(user_id: str, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = db.query(Friendship).filter(
        Friendship.from_id == user_id,
        Friendship.to_id == me.id,
        Friendship.status == "pending",
    ).first()
    if not f:
        raise HTTPException(404, "Заявка не найдена")
    f.status = "accepted"
    db.commit()
    return {"ok": True}


@router.post("/{user_id}/decline")
def decline(user_id: str, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = db.query(Friendship).filter(
        Friendship.from_id == user_id,
        Friendship.to_id == me.id,
        Friendship.status == "pending",
    ).first()
    if not f:
        raise HTTPException(404, "Заявка не найдена")
    db.delete(f)
    db.commit()
    return {"ok": True}


@router.delete("/{user_id}")
def remove(user_id: str, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = db.query(Friendship).filter(
        Friendship.status == "accepted",
        or_(
            and_(Friendship.from_id == me.id, Friendship.to_id == user_id),
            and_(Friendship.from_id == user_id, Friendship.to_id == me.id),
        ),
    ).first()
    if not f:
        raise HTTPException(404, "Не в друзьях")
    db.delete(f)
    db.commit()
    return {"ok": True}