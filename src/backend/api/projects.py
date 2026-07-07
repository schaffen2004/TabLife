from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from db import projects
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str
    start_at: date
    end_at: date
    description: str = ""
    goal: str = ""
    status: Literal["new", "in_progress", "done", "cancel"] = "new"
    progress: int = Field(default=0, ge=0, le=100)


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    goal: Optional[str] = None
    status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None
    start_at: Optional[date] = None
    end_at: Optional[date] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)


@router.get("")
def list_projects(status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None):
    rows = projects.get_by_status(status) if status else projects.get_all()
    return to_json(rows)


@router.post("", status_code=201)
def create_project(payload: ProjectCreate):
    data = payload_data(payload)
    data.pop("progress", None)
    return to_json(projects.create(**data))


@router.get("/{project_id}")
def get_project(project_id: int):
    return to_json(require_found(projects.get_by_id(project_id), "Project"))


@router.patch("/{project_id}")
def update_project(project_id: int, payload: ProjectUpdate):
    data = payload_data(payload, exclude_unset=True)
    data.pop("progress", None)
    return to_json(require_found(projects.update(project_id, **data), "Project"))


@router.delete("/{project_id}")
def delete_project(project_id: int):
    return delete_or_404(projects.delete(project_id), "Project")
