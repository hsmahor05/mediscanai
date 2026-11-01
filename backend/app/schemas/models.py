from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field, field_validator

Sex = Literal["female", "male"]
Op = Literal["<", ">", "<=", ">="]


class Profile(BaseModel):
    sex: Sex | None = None
    age: int | None = Field(default=None, ge=0, le=120)
    bmi: float | None = Field(default=None, gt=0, le=100)
    diastolic_bp: float | None = Field(default=None, gt=0, le=250)


class TestInput(BaseModel):
    key: str | None = Field(default=None, description="Catalog key; null for an unrecognised custom test")
    name: str | None = Field(default=None, max_length=80)
    value: float
    value_operator: Op | None = None
    unit: str | None = Field(default=None, max_length=30)
    ref_low: float | None = None
    ref_high: float | None = None
    user_verified: bool = False
    extraction_status: Literal["ok", "needs_review"] | None = None  # carried through from a previous extraction
    review_reasons: list[str] = []

    @field_validator("value", "ref_low", "ref_high")
    @classmethod
    def finite(cls, v):
        if v is not None and (v != v or abs(v) > 1e9):
            raise ValueError("value must be a finite number")
        return v


class ManualRequest(BaseModel):
    tests: list[TestInput] = Field(max_length=100)
    profile: Profile = Profile()


class AppliedRange(BaseModel):
    low: float | None
    high: float | None
    source: Literal["report", "catalog"]


class TestResult(BaseModel):
    id: str
    key: str | None
    name: str
    value: float
    value_operator: Op | None
    unit: str | None
    ref_low: float | None = None       # range printed on the report (after unit conversion)
    ref_high: float | None = None
    applied_range: AppliedRange | None
    extraction_status: Literal["ok", "needs_review"]
    review_reasons: list[str]
    user_verified: bool
    comparison_status: Literal["below", "within", "above", "undetermined"]
    comparison_note: str | None
    explanation: str | None
    converted_from: str | None = None


class PipelineStep(BaseModel):
    name: str
    status: Literal["done", "skipped", "failed"]
    detail: str


class Summary(BaseModel):
    total: int
    below: int
    within: int
    above: int
    undetermined: int
    needs_review: int


class MLEstimate(BaseModel):
    probability: float
    band: Literal["lower", "higher"]
    inputs_used: dict[str, float]
    imputed_features: list[str]


class MLResult(BaseModel):
    status: Literal["ok", "not_applicable", "needs_verification", "incompatible_input", "unavailable"]
    reasons: list[str]
    estimate: MLEstimate | None = None
    model_name: str | None = None
    limitations: list[str]


class SourceInfo(BaseModel):
    kind: Literal["pdf_text", "pdf_ocr", "image_ocr", "manual"]
    pages: int
    ocr_used: bool


class AnalysisResponse(BaseModel):
    source: SourceInfo
    tests: list[TestResult]
    unmatched_line_count: int
    warnings: list[str]
    summary: Summary
    ml: MLResult
    pipeline: list[PipelineStep]
    disclaimer: str


class ErrorBody(BaseModel):
    code: str
    message: str
