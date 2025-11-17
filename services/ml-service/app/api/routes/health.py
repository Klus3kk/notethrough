from fastapi import APIRouter

from ...config import get_settings

router = APIRouter()


@router.get("", summary="Service health probe")
async def health_check() -> dict[str, str]:
    settings = get_settings()
    return {"status": "ok", "environment": settings.environment}
