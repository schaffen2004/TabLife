from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db import projects, stages, tasks
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _sync_task_progress(task):
    stage_ids = [task.project_stage_id] if task.project_stage_id is not None else []
    tasks.recalculate_work_progress(task.project_id, stage_ids)


def _sync_task_progress_change(before, after=None):
    stage_ids = []
    if before.project_stage_id is not None:
        stage_ids.append(before.project_stage_id)
    if after is not None and after.project_stage_id is not None:
        stage_ids.append(after.project_stage_id)
    tasks.recalculate_work_progress(before.project_id, list(set(stage_ids)))


class TaskCreate(BaseModel):
    goal: str
    project_id: int
    start_at: date
    deadline: date
    expected_result: str = ""
    status: Literal["new", "in_progress", "done", "cancel"] = "new"
    priority: Literal["low", "medium", "high"] = "medium"
    project_stage_id: Optional[int] = None


class TaskUpdate(BaseModel):
    goal: Optional[str] = None
    expected_result: Optional[str] = None
    actual_result: Optional[str] = None
    status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None
    priority: Optional[Literal["low", "medium", "high"]] = None
    start_at: Optional[date] = None
    deadline: Optional[date] = None
    project_stage_id: Optional[int] = None


class TaskStepCreate(BaseModel):
    step_name: str
    position: int = Field(gt=0)
    status: Literal["new", "in_progress", "done", "cancel"] = "new"


class TaskStepUpdate(BaseModel):
    step_name: Optional[str] = None
    position: Optional[int] = Field(default=None, gt=0)
    status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None


class TaskStepsCreate(BaseModel):
    step_names: list[str]


class TaskLinkCreate(BaseModel):
    url: str
    title: Optional[str] = None


class TaskLinkUpdate(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None


@router.get("")
def list_tasks(
    project_id: Optional[int] = None,
    stage_id: Optional[int] = None,
    status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    if date_from is not None or date_to is not None:
        if date_from is None or date_to is None:
            raise HTTPException(status_code=400, detail="date_from and date_to are required together")

    if stage_id is not None:
        if project_id is None:
            raise HTTPException(status_code=400, detail="project_id is required with stage_id")
        require_found(projects.get_by_id(project_id), "Project")
        stage = require_found(stages.get_by_id(stage_id), "Stage")
        if stage.project_id != project_id:
            raise HTTPException(status_code=400, detail="Stage does not belong to project")
        rows = tasks.get_by_stage(project_id, stage_id)
    elif project_id is not None:
        require_found(projects.get_by_id(project_id), "Project")
        rows = tasks.get_by_project(project_id)
    elif date_from is not None:
        rows = tasks.get_by_deadline_range(date_from, date_to)
    elif status is not None:
        rows = tasks.get_by_status(status)
    else:
        rows = tasks.get_all()

    if status is not None and (project_id is not None or stage_id is not None or date_from is not None):
        rows = [row for row in rows if row.status == status]
    if date_from is not None and (project_id is not None or stage_id is not None):
        rows = [row for row in rows if date_from <= row.deadline <= date_to]

    return to_json(rows)


@router.post("", status_code=201)
def create_task(payload: TaskCreate):
    require_found(projects.get_by_id(payload.project_id), "Project")
    if payload.project_stage_id is not None:
        stage = require_found(stages.get_by_id(payload.project_stage_id), "Stage")
        if stage.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Stage does not belong to project")
    created = tasks.create(**payload_data(payload))
    _sync_task_progress(created)
    return to_json(created)


@router.get("/{task_id}/steps")
def list_steps(task_id: int):
    require_found(tasks.get_by_id(task_id), "Task")
    return to_json(tasks.get_steps(task_id))


@router.post("/{task_id}/steps", status_code=201)
def create_step(task_id: int, payload: TaskStepCreate):
    require_found(tasks.get_by_id(task_id), "Task")
    return to_json(tasks.create_step(task_id=task_id, **payload_data(payload)))


@router.post("/{task_id}/steps/bulk", status_code=201)
def create_steps(task_id: int, payload: TaskStepsCreate):
    require_found(tasks.get_by_id(task_id), "Task")
    return to_json(tasks.create_steps(task_id, payload.step_names))


@router.delete("/{task_id}/steps")
def delete_steps(task_id: int):
    require_found(tasks.get_by_id(task_id), "Task")
    return {"deleted": tasks.delete_steps(task_id)}


@router.patch("/steps/{step_id}")
def update_step(step_id: int, payload: TaskStepUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(tasks.update_step(step_id, **data), "Task step"))


@router.delete("/steps/{step_id}")
def delete_step(step_id: int):
    return delete_or_404(tasks.delete_step(step_id), "Task step")


@router.get("/{task_id}/links")
def list_links(task_id: int):
    require_found(tasks.get_by_id(task_id), "Task")
    return to_json(tasks.get_links(task_id))


@router.post("/{task_id}/links", status_code=201)
def create_link(task_id: int, payload: TaskLinkCreate):
    require_found(tasks.get_by_id(task_id), "Task")
    return to_json(tasks.create_link(task_id=task_id, **payload_data(payload)))


@router.patch("/links/{link_id}")
def update_link(link_id: int, payload: TaskLinkUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(tasks.update_link(link_id, **data), "Task link"))


@router.delete("/links/{link_id}")
def delete_link(link_id: int):
    return delete_or_404(tasks.delete_link(link_id), "Task link")


@router.get("/{task_id}")
def get_task(task_id: int):
    return to_json(require_found(tasks.get_by_id(task_id), "Task"))


@router.patch("/{task_id}")
def update_task(task_id: int, payload: TaskUpdate):
    data = payload_data(payload, exclude_unset=True)
    task = require_found(tasks.get_by_id(task_id), "Task")
    if data.get("project_stage_id") is not None:
        stage = require_found(stages.get_by_id(data["project_stage_id"]), "Stage")
        if stage.project_id != task.project_id:
            raise HTTPException(status_code=400, detail="Stage does not belong to task project")
    updated = require_found(tasks.update(task_id, **data), "Task")
    _sync_task_progress_change(task, updated)
    return to_json(updated)


@router.delete("/{task_id}")
def delete_task(task_id: int):
    task = require_found(tasks.get_by_id(task_id), "Task")
    deleted = tasks.delete(task_id)
    if deleted:
        _sync_task_progress_change(task)
    return delete_or_404(deleted, "Task")
