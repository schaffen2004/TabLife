from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db import research
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(prefix="/research", tags=["research"])


class ResearchCreate(BaseModel):
    name: str
    start_at: date
    description: str = ""
    status: Literal["new", "in_progress", "done", "cancel"] = "new"
    link: Optional[str] = None


class ResearchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None
    start_at: Optional[date] = None
    link: Optional[str] = None


class SubtopicCreate(BaseModel):
    name: str
    start_at: date
    description: str = ""
    note: Optional[str] = None
    status: Literal["new", "in_progress", "done", "cancel"] = "new"
    position: Optional[int] = Field(default=None, gt=0)


class SubtopicUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    note: Optional[str] = None
    status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None
    start_at: Optional[date] = None
    position: Optional[int] = Field(default=None, gt=0)


class ReorderSubtopics(BaseModel):
    ordered_ids: list[int]


class SubtopicLinkCreate(BaseModel):
    url: str
    title: Optional[str] = None


class SubtopicLinkUpdate(BaseModel):
    url: Optional[str] = None
    title: Optional[str] = None


@router.get("")
def list_topics(status: Optional[Literal["new", "in_progress", "done", "cancel"]] = None):
    rows = research.get_by_status(status) if status else research.get_all()
    return to_json(rows)


@router.post("", status_code=201)
def create_topic(payload: ResearchCreate):
    return to_json(research.create(**payload_data(payload)))


@router.get("/{topic_id}/subtopics")
def list_subtopics(topic_id: int):
    require_found(research.get_by_id(topic_id), "Research topic")
    return to_json(research.get_subtopics(topic_id))


@router.post("/{topic_id}/subtopics", status_code=201)
def create_subtopic(topic_id: int, payload: SubtopicCreate):
    require_found(research.get_by_id(topic_id), "Research topic")
    return to_json(research.create_subtopic(topic_id=topic_id, **payload_data(payload)))


@router.put("/{topic_id}/subtopics/reorder")
def reorder_subtopics(topic_id: int, payload: ReorderSubtopics):
    require_found(research.get_by_id(topic_id), "Research topic")
    if len(payload.ordered_ids) != len(set(payload.ordered_ids)):
        raise HTTPException(status_code=400, detail="ordered_ids must not contain duplicates")
    existing_ids = {subtopic.subtopic_id for subtopic in research.get_subtopics(topic_id)}
    unknown_ids = [subtopic_id for subtopic_id in payload.ordered_ids if subtopic_id not in existing_ids]
    if unknown_ids:
        raise HTTPException(status_code=400, detail="ordered_ids must belong to topic")
    return to_json(research.reorder_subtopics(topic_id, payload.ordered_ids))


@router.get("/subtopics/{subtopic_id}")
def get_subtopic(subtopic_id: int):
    return to_json(require_found(research.get_subtopic_by_id(subtopic_id), "Subtopic"))


@router.patch("/subtopics/{subtopic_id}")
def update_subtopic(subtopic_id: int, payload: SubtopicUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(research.update_subtopic(subtopic_id, **data), "Subtopic"))


@router.delete("/subtopics/{subtopic_id}")
def delete_subtopic(subtopic_id: int):
    return delete_or_404(research.delete_subtopic(subtopic_id), "Subtopic")


@router.get("/subtopics/{subtopic_id}/links")
def list_links(subtopic_id: int):
    require_found(research.get_subtopic_by_id(subtopic_id), "Subtopic")
    return to_json(research.get_links(subtopic_id))


@router.post("/subtopics/{subtopic_id}/links", status_code=201)
def create_link(subtopic_id: int, payload: SubtopicLinkCreate):
    require_found(research.get_subtopic_by_id(subtopic_id), "Subtopic")
    return to_json(research.create_link(subtopic_id=subtopic_id, **payload_data(payload)))


@router.patch("/links/{link_id}")
def update_link(link_id: int, payload: SubtopicLinkUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(research.update_link(link_id, **data), "Subtopic link"))


@router.delete("/links/{link_id}")
def delete_link(link_id: int):
    return delete_or_404(research.delete_link(link_id), "Subtopic link")


@router.get("/{topic_id}")
def get_topic(topic_id: int):
    return to_json(require_found(research.get_by_id(topic_id), "Research topic"))


@router.patch("/{topic_id}")
def update_topic(topic_id: int, payload: ResearchUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(research.update(topic_id, **data), "Research topic"))


@router.delete("/{topic_id}")
def delete_topic(topic_id: int):
    return delete_or_404(research.delete(topic_id), "Research topic")
