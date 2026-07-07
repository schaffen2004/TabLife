from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from db import plans
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(prefix="/plans", tags=["plans"])


class PlanCreate(BaseModel):
    name: str
    goal: str = ""
    estimated_time: str = ""
    status: Literal["draft", "active", "done", "cancel"] = "draft"


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    estimated_time: Optional[str] = None
    status: Optional[Literal["draft", "active", "done", "cancel"]] = None


class RequirementCreate(BaseModel):
    name: str
    status: Literal["new", "in_progress", "done", "cancel"] = "new"
    position: Optional[int] = Field(default=None, gt=0)


class RequirementUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None
    position: Optional[int] = Field(default=None, gt=0)


@router.get("")
def list_plans(include_requirements: bool = False):
    return to_json(plans.get_all(include_requirements=include_requirements))


@router.post("", status_code=201)
def create_plan(payload: PlanCreate):
    return to_json(plans.create(**payload_data(payload)))


@router.get("/{plan_id}/requirements")
def list_requirements(plan_id: int):
    require_found(plans.get_by_id(plan_id, include_requirements=False), "Plan")
    return to_json(plans.get_requirements(plan_id))


@router.post("/{plan_id}/requirements", status_code=201)
def add_requirement(plan_id: int, payload: RequirementCreate):
    require_found(plans.get_by_id(plan_id, include_requirements=False), "Plan")
    return to_json(plans.add_requirement(plan_id=plan_id, **payload_data(payload)))


@router.patch("/requirements/{requirement_id}")
def update_requirement(requirement_id: int, payload: RequirementUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(plans.update_requirement(requirement_id, **data), "Plan requirement"))


@router.delete("/requirements/{requirement_id}")
def delete_requirement(requirement_id: int):
    return delete_or_404(plans.delete_requirement(requirement_id), "Plan requirement")


@router.get("/{plan_id}")
def get_plan(plan_id: int, include_requirements: bool = True):
    return to_json(require_found(plans.get_by_id(plan_id, include_requirements), "Plan"))


@router.patch("/{plan_id}")
def update_plan(plan_id: int, payload: PlanUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(plans.update(plan_id, **data), "Plan"))


@router.delete("/{plan_id}")
def delete_plan(plan_id: int):
    return delete_or_404(plans.delete(plan_id), "Plan")
