from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.telegram_notifications import send_telegram_message


router = APIRouter(prefix="/notification", tags=["notification"])


class TelegramMessagePayload(BaseModel):
    message: str = Field(min_length=1)


@router.post("/telegram/send")
def send_telegram(payload: TelegramMessagePayload):
    try:
        send_telegram_message(payload.message)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"sent": True}
