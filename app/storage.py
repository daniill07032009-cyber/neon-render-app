import uuid
from pathlib import Path
from app.config import settings

UPLOAD_DIR = Path(settings.UPLOAD_DIR).resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def upload_fileobj(file_obj, user_id: str, filename: str, content_type: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    user_dir = UPLOAD_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}.{ext}"
    dest = user_dir / name
    with open(dest, "wb") as f:
        f.write(file_obj.read())
    return f"{settings.UPLOAD_URL_PREFIX}/{user_id}/{name}"