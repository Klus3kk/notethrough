from fastapi import APIRouter

router = APIRouter()


@router.get("", summary="Health check")
async def read_health() -> dict[str, str]:
    return {"status": "ok"}
