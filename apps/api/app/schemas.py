import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    company_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MembershipOut(BaseModel):
    factory_id: uuid.UUID
    factory_name: str
    role: str
    capabilities: list[str]
    timezone: str
    currency: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    full_name: str
    role: str
    memberships: list[MembershipOut] = Field(default_factory=list)
    active_factory_id: uuid.UUID | None = None
    capabilities: list[str] = Field(default_factory=list)
    language: str = "en"
    onboarding_state: str = "ready"


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    doc_type: str
    department: str
    language: str
    status: str
    page_count: int
    error: str
    created_at: datetime


class Citation(BaseModel):
    document_id: uuid.UUID
    document_name: str
    page: int
    chunk_index: int
    snippet: str


class ChatIn(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=8, ge=1, le=20)


class ChatOut(BaseModel):
    answer: str
    citations: list[Citation]
    provider: str
    model: str
    trace_id: str
    confidence: float = Field(ge=0, le=1)
    evidence_coverage: float = Field(ge=0, le=1)
    freshness: str
    limitations: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    latency_ms: int = Field(ge=0)
