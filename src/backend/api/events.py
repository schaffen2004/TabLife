from __future__ import annotations

from datetime import date, time
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from db import events
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(prefix="/events", tags=["events"])


class EventCreate(BaseModel):
    name: str
    event_date: date
    start_time: time
    description: str = ""
    location: Optional[str] = None
    end_time: Optional[time] = None
    status: Literal["upcoming", "done", "cancel"] = "upcoming"


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    status: Optional[Literal["upcoming", "done", "cancel"]] = None


@router.get("")
def list_events(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    status: Optional[Literal["upcoming", "done", "cancel"]] = None,
):
    return to_json(events.get_all(date_from=date_from, date_to=date_to, status=status))


@router.post("", status_code=201)
def create_event(payload: EventCreate):
    return to_json(events.create(**payload_data(payload)))


@router.get("/{event_id}")
def get_event(event_id: int):
    return to_json(require_found(events.get_by_id(event_id), "Event"))


@router.patch("/{event_id}")
def update_event(event_id: int, payload: EventUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(events.update(event_id, **data), "Event"))


@router.delete("/{event_id}")
def delete_event(event_id: int):
    return delete_or_404(events.delete(event_id), "Event")
