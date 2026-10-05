from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ---------- Auth ----------
class RegisterIn(BaseModel):
    username: str = Field(min_length=2, max_length=20, pattern=r"^[A-Za-z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=4)
    displayName: str = Field(min_length=2, max_length=40)


class LoginIn(BaseModel):
    login: str
    password: str


# ---------- Users ----------
class UserOut(BaseModel):
    id: str
    username: str
    email: str | None = None
    displayName: str
    bio: str = ""
    avatarUrl: str | None = None


class UpdateProfileIn(BaseModel):
    displayName: str | None = None
    bio: str | None = None
    avatarUrl: str | None = None


# ---------- Books ----------
class ChapterIn(BaseModel):
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)


class ChapterOut(BaseModel):
    id: str
    title: str
    content: str
    order: int


class BookIn(BaseModel):
    title: str = Field(min_length=3)
    annotation: str = Field(min_length=80)
    genre: str = Field(min_length=2)
    coverUrl: str | None = None
    coverSymbol: str = "📖"
    status: str = "published"
    chapters: list[ChapterIn]


class BookOut(BaseModel):
    id: str
    title: str
    annotation: str
    genre: str
    coverUrl: str | None
    coverSymbol: str
    status: str
    authorId: str
    authorUsername: str
    chaptersCount: int
    createdAt: datetime
    updatedAt: datetime


class BookWithChapters(BookOut):
    chapters: list[ChapterOut]


# ---------- Progress ----------
class ProgressIn(BaseModel):
    chapterIndex: int


class ProgressOut(BaseModel):
    bookId: str
    chapterIndex: int
    updatedAt: datetime


# ---------- Friends ----------
class FriendRequestIn(BaseModel):
    toUserId: str


# ---------- Communities ----------
class CommunityIn(BaseModel):
    title: str = Field(min_length=3, max_length=80)
    username: str = Field(min_length=3, max_length=24, pattern=r"^[A-Za-z0-9_]+$")
    description: str = Field(min_length=20, max_length=500)
    avatarUrl: str | None = None


class CommunityOut(BaseModel):
    id: str
    title: str
    username: str
    description: str
    avatarUrl: str | None
    ownerId: str
    membersCount: int
    createdAt: datetime


# ---------- Messages ----------
class MessageIn(BaseModel):
    chatId: str
    text: str = Field(min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: str
    chatId: str
    authorId: str
    authorUsername: str
    text: str
    createdAt: datetime


# ---------- Reviews ----------
class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = ""


class ReviewOut(BaseModel):
    id: str
    bookId: str
    userId: str
    username: str
    rating: int
    text: str
    createdAt: datetime