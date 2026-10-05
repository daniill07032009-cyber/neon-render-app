import io
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.deps import get_current_user
from app.storage import upload_fileobj
from app.models import User

router = APIRouter(prefix="/api/upload", tags=["upload"])

ALLOWED = {"image/png", "image/jpeg", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024


@router.post("")
async def upload(me: User = Depends(get_current_user), file: UploadFile = File(...)):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "Разрешены только изображения (png, jpg, webp, gif)")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "Файл слишком большой (макс 5 МБ)")
    url = upload_fileobj(io.BytesIO(content), me.id, file.filename, file.content_type)
    return {"url": url}