from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Community, CommunityMember, Chat
from app.schemas import CommunityIn, CommunityOut, UserOut
from app.deps import get_current_user
from app.routers.users import user_out

router = APIRouter(prefix="/api/communities", tags=["communities"])


def community_out(c: Community, db: Session) -> CommunityOut:
    members_count = db.query(CommunityMember).filter(CommunityMember.community_id == c.id).count()
    return CommunityOut(
        id=c.id, title=c.title, username=c.username,
        description=c.description, avatarUrl=c.avatar_url,
        ownerId=c.owner_id, membersCount=members_count,
        createdAt=c.created_at,
    )


@router.get("", response_model=list[CommunityOut])
def list_communities(db: Session = Depends(get_db)):
    return [community_out(c, db) for c in db.query(Community).order_by(Community.created_at.desc()).all()]


@router.post("", response_model=CommunityOut, status_code=201)
def create_community(
    data: CommunityIn,
    me: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(Community).filter(Community.username == data.username).first():
        raise HTTPException(409, "Такой @username уже занят")

    c = Community(
        title=data.title,
        username=data.username,
        description=data.description,
        avatar_url=data.avatarUrl,
        owner_id=me.id,
    )
    db.add(c)
    db.flush()

    db.add(CommunityMember(community_id=c.id, user_id=me.id, role="owner"))

    chat = Chat(type="community", community_id=c.id)
    db.add(chat)

    db.commit()
    db.refresh(c)
    return community_out(c, db)


@router.get("/{community_id}", response_model=CommunityOut)
def get_community(community_id: str, db: Session = Depends(get_db)):
    c = db.get(Community, community_id)
    if not c:
        raise HTTPException(404, "Сообщество не найдено")
    return community_out(c, db)


@router.get("/{community_id}/members", response_model=list[UserOut])
def members(community_id: str, db: Session = Depends(get_db)):
    rows = db.query(CommunityMember).filter(CommunityMember.community_id == community_id).all()
    ids = [r.user_id for r in rows]
    if not ids:
        return []
    return [user_out(u) for u in db.query(User).filter(User.id.in_(ids)).all()]


@router.get("/{community_id}/joined")
def is_joined(community_id: str, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == me.id,
    ).first()
    return {"joined": bool(m)}


@router.post("/{community_id}/join")
def join(community_id: str, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.get(Community, community_id)
    if not c:
        raise HTTPException(404, "Сообщество не найдено")
    exists = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == me.id,
    ).first()
    if exists:
        return {"ok": True}
    db.add(CommunityMember(community_id=community_id, user_id=me.id, role="member"))
    db.commit()
    return {"ok": True}


@router.post("/{community_id}/leave")
def leave(community_id: str, me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == me.id,
    ).first()
    if not m:
        return {"ok": True}
    if m.role == "owner":
        raise HTTPException(400, "Владелец не может покинуть сообщество")
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.get("/me/list", response_model=list[CommunityOut])
def my_communities(me: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(CommunityMember).filter(CommunityMember.user_id == me.id).all()
    ids = [r.community_id for r in rows]
    if not ids:
        return []
    return [community_out(c, db) for c in db.query(Community).filter(Community.id.in_(ids)).all()]