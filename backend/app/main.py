from __future__ import annotations

from fastapi import FastAPI

from .api import api_router
from .config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
    )

    app.include_router(api_router)

    @app.get("/", tags=["meta"], summary="API metadata")
    async def root() -> dict[str, str]:
        return {"message": f"{settings.app_name} (env={settings.environment})"}

    return app


app = create_app()
