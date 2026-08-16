from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from db import notes
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(prefix="/notes", tags=["notes"])


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    pinned: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    pinned: Optional[bool] = None


@router.get("")
def list_notes():
    return to_json(notes.get_all())


@router.post("", status_code=201)
def create_note(payload: NoteCreate):
    return to_json(notes.create(**payload_data(payload)))


@router.get("/{note_id}")
def get_note(note_id: int):
    return to_json(require_found(notes.get_by_id(note_id), "Note"))


@router.patch("/{note_id}")
def update_note(note_id: int, payload: NoteUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(notes.update(note_id, **data), "Note"))


@router.delete("/{note_id}")
def delete_note(note_id: int):
    return delete_or_404(notes.delete(note_id), "Note")
