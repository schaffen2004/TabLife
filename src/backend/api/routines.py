from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from db import routines
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(prefix="/routines", tags=["routines"])


class RoutineCreate(BaseModel):
    name: str
    note: Optional[str] = None


class RoutineUpdate(BaseModel):
    name: Optional[str] = None
    note: Optional[str] = None
    streak: Optional[int] = Field(default=None, ge=0)


class CheckinCreate(BaseModel):
    completed_on: Optional[date] = None


@router.get("")
def list_routines():
    return to_json(routines.get_all())


@router.post("", status_code=201)
def create_routine(payload: RoutineCreate):
    return to_json(routines.create(**payload_data(payload)))


@router.get("/{routine_id}")
def get_routine(routine_id: int):
    return to_json(require_found(routines.get_by_id(routine_id), "Routine"))


@router.patch("/{routine_id}")
def update_routine(routine_id: int, payload: RoutineUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(routines.update(routine_id, **data), "Routine"))


@router.delete("/{routine_id}")
def delete_routine(routine_id: int):
    return delete_or_404(routines.delete(routine_id), "Routine")


@router.post("/{routine_id}/streak/increment")
def increment_streak(routine_id: int):
    return to_json(require_found(routines.increment_streak(routine_id), "Routine"))


@router.post("/{routine_id}/streak/reset")
def reset_streak(routine_id: int):
    return to_json(require_found(routines.reset_streak(routine_id), "Routine"))


@router.get("/{routine_id}/checkins")
def list_checkins(
    routine_id: int,
    limit: int = Query(default=30, ge=1, le=365),
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    require_found(routines.get_by_id(routine_id), "Routine")
    if date_from is not None or date_to is not None:
        if date_from is None or date_to is None:
            raise HTTPException(status_code=400, detail="date_from and date_to are required together")
        rows = routines.get_checkins_in_range(routine_id, date_from, date_to)
    else:
        rows = routines.get_checkins(routine_id, limit)
    return to_json(rows)


@router.post("/{routine_id}/checkins", status_code=201)
def checkin(routine_id: int, payload: CheckinCreate):
    require_found(routines.get_by_id(routine_id), "Routine")
    return to_json(routines.checkin_today(routine_id, payload.completed_on))


@router.delete("/{routine_id}/checkins")
def undo_checkin(routine_id: int, completed_on: Optional[date] = None):
    require_found(routines.get_by_id(routine_id), "Routine")
    return delete_or_404(routines.undo_checkin(routine_id, completed_on), "Routine checkin")
