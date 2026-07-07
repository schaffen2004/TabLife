from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel


def payload_data(payload: BaseModel, *, exclude_unset: bool = False) -> dict[str, Any]:
    if hasattr(payload, "model_dump"):
        return payload.model_dump(exclude_unset=exclude_unset)
    return payload.dict(exclude_unset=exclude_unset)


def to_json(value: Any) -> Any:
    if is_dataclass(value):
        return to_json(asdict(value))
    if isinstance(value, list):
        return [to_json(item) for item in value]
    if isinstance(value, dict):
        return {key: to_json(item) for key, item in value.items()}
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    return value


def require_found(value: Any, name: str = "Resource") -> Any:
    if value is None:
        raise HTTPException(status_code=404, detail=f"{name} not found")
    return value


def delete_or_404(deleted: bool, name: str = "Resource") -> dict[str, bool]:
    if not deleted:
        raise HTTPException(status_code=404, detail=f"{name} not found")
    return {"deleted": True}
