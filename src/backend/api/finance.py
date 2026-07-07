from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel, Field

from db import finance
from .utils import delete_or_404, payload_data, require_found, to_json

router = APIRouter(prefix="/finance", tags=["finance"])


class IncomeCreate(BaseModel):
    amount: int = Field(gt=0)
    category: Literal["salary", "freelance", "business", "gift", "allowance", "other"]
    income_date: date
    note: Optional[str] = None


class IncomeUpdate(BaseModel):
    amount: Optional[int] = Field(default=None, gt=0)
    category: Optional[Literal["salary", "freelance", "business", "gift", "allowance", "other"]] = None
    income_date: Optional[date] = None
    note: Optional[str] = None


class ExpenseCreate(BaseModel):
    amount: int = Field(gt=0)
    category: Literal[
        "housing",
        "food_and_drink",
        "transportation",
        "healthcare",
        "education",
        "technology",
        "entertainment",
        "social_relationships",
        "family",
        "unexpected_expenses",
        "other",
    ]
    expense_date: date
    note: Optional[str] = None


class ExpenseUpdate(BaseModel):
    amount: Optional[int] = Field(default=None, gt=0)
    category: Optional[Literal[
        "housing",
        "food_and_drink",
        "transportation",
        "healthcare",
        "education",
        "technology",
        "entertainment",
        "social_relationships",
        "family",
        "unexpected_expenses",
        "other",
    ]] = None
    expense_date: Optional[date] = None
    note: Optional[str] = None


@router.get("/income")
def list_income(
    month: Optional[int] = Query(default=None, ge=1, le=12),
    year: Optional[int] = Query(default=None, ge=1),
):
    if month is not None and year is None:
        raise HTTPException(status_code=400, detail="year is required with month")
    return to_json(finance.get_all_income(month=month, year=year))


@router.post("/income", status_code=201)
def create_income(payload: IncomeCreate):
    return to_json(finance.create_income(**payload_data(payload)))


@router.get("/income/{income_id}")
def get_income(income_id: int):
    return to_json(require_found(finance.get_income_by_id(income_id), "Income"))


@router.patch("/income/{income_id}")
def update_income(income_id: int, payload: IncomeUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(finance.update_income(income_id, **data), "Income"))


@router.delete("/income/{income_id}")
def delete_income(income_id: int):
    return delete_or_404(finance.delete_income(income_id), "Income")


@router.get("/expense")
def list_expense(
    month: Optional[int] = Query(default=None, ge=1, le=12),
    year: Optional[int] = Query(default=None, ge=1),
):
    if month is not None and year is None:
        raise HTTPException(status_code=400, detail="year is required with month")
    return to_json(finance.get_all_expense(month=month, year=year))


@router.post("/expense", status_code=201)
def create_expense(payload: ExpenseCreate):
    return to_json(finance.create_expense(**payload_data(payload)))


@router.get("/expense/{expense_id}")
def get_expense(expense_id: int):
    return to_json(require_found(finance.get_expense_by_id(expense_id), "Expense"))


@router.patch("/expense/{expense_id}")
def update_expense(expense_id: int, payload: ExpenseUpdate):
    data = payload_data(payload, exclude_unset=True)
    return to_json(require_found(finance.update_expense(expense_id, **data), "Expense"))


@router.delete("/expense/{expense_id}")
def delete_expense(expense_id: int):
    return delete_or_404(finance.delete_expense(expense_id), "Expense")


@router.get("/summary/{year}/{month}")
def monthly_summary(year: int = Path(ge=1), month: int = Path(ge=1, le=12)):
    return finance.monthly_summary(year, month)


@router.get("/expense-by-category/{year}/{month}")
def expense_by_category(year: int = Path(ge=1), month: int = Path(ge=1, le=12)):
    return finance.expense_by_category(year, month)
