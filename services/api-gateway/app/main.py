from __future__ import annotations

from fastapi import FastAPI

from .api import api_router
from .config import get_settings
from .services.ml_client import close_client as close_ml_client
from .cache import close_client as close_cache_client


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

    @app.on_event("shutdown")
    async def shutdown_clients() -> None:
        await close_ml_client()
        await close_cache_client()

    return app


app = create_app()
