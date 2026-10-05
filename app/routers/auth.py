from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models import User
from app.security import hash_password, verify_password
from app.schemas import RegisterIn, LoginIn, UserOut
from app.deps import set_session_cookie, clear_session_cookie, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id, username=u.username, email=u.email,
        displayName=u.display_name, bio=u.bio, avatarUrl=u.avatar_url,
    )


@router.post("/register", response_model=UserOut)
def register(data: RegisterIn, response: Response, db: Session = Depends(get_db)):
    exists = db.query(User).filter(
        or_(User.username == data.username, User.email == data.email)
    ).first()
    if exists:
        raise HTTPException(409, "Юзернейм или email заняты")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.displayName,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    set_session_cookie(response, user.id)
    return user_out(user)


@router.post("/login", response_model=UserOut)
def login(data: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(User.username == data.login, User.email == data.login)
    ).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Неверный логин или пароль")

    set_session_cookie(response, user.id)
    return user_out(user)


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut | None)
def me(user: User | None = Depends(get_current_user)):
    if not user:
        return None
    return user_out(user)