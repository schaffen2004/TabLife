from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from contextlib import suppress
from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from api import finance, plans, projects, research, routines, settings, stages, tasks
from db import close_pool
from services.telegram_notifications import telegram_notification_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    notification_task = asyncio.create_task(telegram_notification_worker())
    try:
        yield
    finally:
        notification_task.cancel()
        with suppress(asyncio.CancelledError):
            await notification_task
        close_pool()


app = FastAPI(title="TabLife API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(stages.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(research.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(routines.router, prefix="/api")
app.include_router(finance.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
