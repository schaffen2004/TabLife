from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from db import projects, stages
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(tags=["stages"])


class StageCreate(BaseModel):
    name: str
    goal: str = ""
    status: Literal["new", "in_progress", "done", "cancel"] = "new"
    progress: int = Field(default=0, ge=0, le=100)


class StageUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)


@router.get("/projects/{project_id}/stages")
def list_project_stages(project_id: int):
    require_found(projects.get_by_id(project_id), "Project")
    return to_json(stages.get_by_project(project_id))


@router.post("/projects/{project_id}/stages", status_code=201)
def create_project_stage(project_id: int, payload: StageCreate):
    require_found(projects.get_by_id(project_id), "Project")
    data = payload_data(payload)
    data.pop("progress", None)
    return to_json(stages.create(project_id=project_id, **data))


@router.get("/stages/{stage_id}")
def get_stage(stage_id: int):
    return to_json(require_found(stages.get_by_id(stage_id), "Stage"))


@router.patch("/stages/{stage_id}")
def update_stage(stage_id: int, payload: StageUpdate):
    data = payload_data(payload, exclude_unset=True)
    data.pop("progress", None)
    return to_json(require_found(stages.update(stage_id, **data), "Stage"))


@router.delete("/stages/{stage_id}")
def delete_stage(stage_id: int):
    return delete_or_404(stages.delete(stage_id), "Stage")
