from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models import Chat, ChatMember, Message, User, Community
from app.schemas import MessageIn, MessageOut
from app.deps import get_current_user

router = APIRouter(prefix="/api/messages", tags=["messages"])


def message_out(m: Message, author: User) -> MessageOut:
    return MessageOut(
        id=m.id, chatId=m.chat_id, authorId=m.author_id,
        authorUsername=author.username,
        text=m.text, createdAt=m.created_at,
    )


@router.post("/dm")
def open_dm(
    payload: dict,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    other_id = payload.get("userId")
    if not other_id or other_id == me.id:
        raise HTTPException(400, "Укажите собеседника")

    other = db.get(User, other_id)
    if not other:
        raise HTTPException(404, "Пользователь не найден")

    my_chats = db.query(ChatMember.chat_id).filter(ChatMember.user_id == me.id).subquery()
    other_chats = db.query(ChatMember.chat_id).filter(ChatMember.user_id == other_id).subquery()

    existing = (
        db.query(Chat)
        .filter(Chat.type == "dm", Chat.id.in_(my_chats), Chat.id.in_(other_chats))
        .first()
    )
    if existing:
        return {"chatId": existing.id}

    chat = Chat(type="dm")
    db.add(chat)
    db.flush()
    db.add(ChatMember(chat_id=chat.id, user_id=me.id))
    db.add(ChatMember(chat_id=chat.id, user_id=other_id))
    db.commit()
    return {"chatId": chat.id}


@router.get("/chats")
def my_chats(me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(ChatMember).filter(ChatMember.user_id == me.id).all()
    result = []
    for row in rows:
        chat = db.get(Chat, row.chat_id)
        if not chat:
            continue
        title = ""
        other_user_id = None
        if chat.type == "dm":
            other_member = db.query(ChatMember).filter(
                ChatMember.chat_id == chat.id, ChatMember.user_id != me.id
            ).first()
            if other_member:
                other_user = db.get(User, other_member.user_id)
                if other_user:
                    title = other_user.display_name
                    other_user_id = other_user.id
        else:
            comm = db.get(Community, chat.community_id) if chat.community_id else None
            title = comm.title if comm else "Сообщество"
        result.append({
            "chatId": chat.id,
            "type": chat.type,
            "title": title,
            "otherUserId": other_user_id,
        })
    return result


@router.get("/chats/{chat_id}/messages", response_model=list[MessageOut])
def get_messages(
    chat_id: str,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = db.query(ChatMember).filter(
        ChatMember.chat_id == chat_id, ChatMember.user_id == me.id
    ).first()
    if not membership:
        raise HTTPException(403, "Нет доступа")

    rows = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).limit(500).all()
    result = []
    for m in rows:
        author = db.get(User, m.author_id)
        if author:
            result.append(message_out(m, author))
    return result