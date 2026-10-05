from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.websocket import chat_manager
from app.deps import get_current_user_optional
from app.models import User, Chat, ChatMember, Message

# Роутеры
from app.routers import auth, users, books, upload, friends, communities, messages, reviews

# Регистрируем таблицы и создаём БД при первом запуске
import app.models  # noqa
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME)


# ---------- Middleware: обновляем last_seen при каждом запросе ----------
class LastSeenMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        try:
            token = request.cookies.get(settings.SESSION_COOKIE_NAME)
            if token:
                from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
                serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="sl-session")
                data = serializer.loads(token, max_age=settings.SESSION_MAX_AGE)
                uid = data.get("uid")
                if uid:
                    db = SessionLocal()
                    try:
                        user = db.get(User, uid)
                        if user:
                            user.last_seen = datetime.utcnow()
                            db.commit()
                    finally:
                        db.close()
        except Exception:
            pass
        return response


app.add_middleware(LastSeenMiddleware)


# CORS для дев-режима
if settings.ENV == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Роутеры
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(books.router)
app.include_router(upload.router)
app.include_router(friends.router)
app.include_router(communities.router)
app.include_router(messages.router)
app.include_router(reviews.router)


@app.get("/api/health")
def health():
    return {"ok": True, "app": settings.APP_NAME}


# ---------- WebSocket для чата ----------
@app.websocket("/ws/chat/{chat_id}")
async def ws_chat(websocket: WebSocket, chat_id: str):
    db: Session = SessionLocal()
    try:
        user = get_current_user_optional_ws(websocket, db)
        if not user:
            await websocket.close(code=4401)
            return

        member = db.query(ChatMember).filter(
            ChatMember.chat_id == chat_id, ChatMember.user_id == user.id
        ).first()
        if not member:
            await websocket.close(code=4403)
            return

        await chat_manager.connect_chat(chat_id, websocket)
        try:
            while True:
                data = await websocket.receive_json()
                text = (data.get("text") or "").strip()
                if not text:
                    continue
                msg = Message(chat_id=chat_id, author_id=user.id, text=text)
                db.add(msg)
                db.commit()
                db.refresh(msg)
                await chat_manager.broadcast_chat(chat_id, {
                    "id": msg.id,
                    "chatId": chat_id,
                    "authorId": user.id,
                    "authorUsername": user.username,
                    "text": msg.text,
                    "createdAt": msg.created_at.isoformat(),
                })
        except WebSocketDisconnect:
            chat_manager.disconnect_chat(chat_id, websocket)
    finally:
        db.close()


def get_current_user_optional_ws(websocket: WebSocket, db: Session) -> User | None:
    from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
    serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="sl-session")
    token = websocket.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        return None
    try:
        data = serializer.loads(token, max_age=settings.SESSION_MAX_AGE)
        return db.get(User, data.get("uid"))
    except (BadSignature, SignatureExpired):
        return None


# ---------- Раздача статики и uploads ----------
UPLOAD_DIR = Path(settings.UPLOAD_DIR).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/")
    def index():
        return FileResponse(STATIC_DIR / "index.html")
