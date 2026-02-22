"""API routes for user development / feature requests."""

import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.db_utils import db_load, db_save

router = APIRouter(tags=["feature-requests"])

DB_KEY = "feature_requests"


class FeatureRequestCreate(BaseModel):
    title: str
    description: str
    submitted_by: str = "User"


class FeatureRequestResponse(BaseModel):
    id: str
    title: str
    description: str
    submitted_by: str
    created_at: str
    votes: int
    status: str


def _load_requests() -> list:
    return db_load(DB_KEY) or []


def _save_requests(data: list):
    db_save(DB_KEY, data)


@router.get("/feature-requests", response_model=List[FeatureRequestResponse])
def list_requests():
    """Return all feature requests, newest first."""
    items = _load_requests()
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return items


@router.post("/feature-requests", response_model=FeatureRequestResponse)
def create_request(body: FeatureRequestCreate):
    """Submit a new feature request."""
    if not body.title.strip() or not body.description.strip():
        raise HTTPException(status_code=400, detail="Title and description are required")

    items = _load_requests()
    item = {
        "id": str(uuid.uuid4()),
        "title": body.title.strip(),
        "description": body.description.strip(),
        "submitted_by": body.submitted_by.strip() or "User",
        "created_at": datetime.utcnow().isoformat(),
        "votes": 0,
        "status": "submitted",
    }
    items.append(item)
    _save_requests(items)
    return item


@router.post("/feature-requests/{request_id}/vote")
def vote_request(request_id: str):
    """Upvote a feature request."""
    items = _load_requests()
    for item in items:
        if item["id"] == request_id:
            item["votes"] = item.get("votes", 0) + 1
            _save_requests(items)
            return {"ok": True, "votes": item["votes"]}
    raise HTTPException(status_code=404, detail="Request not found")


@router.delete("/feature-requests/{request_id}")
def delete_request(request_id: str):
    """Delete a feature request."""
    items = _load_requests()
    new_items = [i for i in items if i["id"] != request_id]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Request not found")
    _save_requests(new_items)
    return {"ok": True}
