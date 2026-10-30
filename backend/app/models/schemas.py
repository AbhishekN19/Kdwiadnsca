from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ActualRecord(BaseModel):
    startTime: str
    publishTime: Optional[str] = None
    settlementDate: str
    settlementPeriod: int
    fuelType: str = "WIND"
    generation: float

class ForecastRecord(BaseModel):
    startTime: str
    publishTime: str
    generation: float

class MatchedRecord(BaseModel):
    startTime: str
    settlementDate: str
    settlementPeriod: Optional[int] = None
    actualGeneration: float
    forecastGeneration: float
    publishTime: str
    leadTimeHours: float
    error: float = Field(..., description="Forecast - Actual (MW). Positive = Overestimation, Negative = Underestimation.")
    absoluteError: float = Field(..., description="|Forecast - Actual| (MW)")
    percentageError: Optional[float] = Field(None, description="Percentage error relative to actual")

class AccuracyMetrics(BaseModel):
    count: int
    mae: float = Field(..., description="Mean Absolute Error in MW")
    rmse: float = Field(..., description="Root Mean Square Error in MW")
    mbe: float = Field(..., description="Mean Bias Error in MW (+ = Overestimation, - = Underestimation)")
    nmae: float = Field(..., description="Normalized MAE (% of mean actual generation)")
    mape: Optional[float] = Field(None, description="Mean Absolute Percentage Error (%)")
    maxPositiveError: float = Field(..., description="Maximum Overestimation (MW)")
    maxNegativeError: float = Field(..., description="Maximum Underestimation (MW)")
    correlation: Optional[float] = Field(None, description="Pearson correlation coefficient r")
    avgActual: float = Field(..., description="Average Actual Generation in MW")
    avgForecast: float = Field(..., description="Average Forecasted Generation in MW")

class ErrorBin(BaseModel):
    rangeLabel: str
    minMW: float
    maxMW: float
    count: int
    percentage: float

class DailyAccuracy(BaseModel):
    date: str
    count: int
    mae: float
    rmse: float
    mbe: float
    nmae: float
    avgActual: float
    avgForecast: float
    maxPositiveError: float
    maxNegativeError: float

class IntradayProfile(BaseModel):
    settlementPeriod: int
    timeOfDay: str
    count: int
    mae: float
    rmse: float
    mbe: float
    avgActual: float
    avgForecast: float

class ForecastRevision(BaseModel):
    publishTime: str
    leadTimeHours: float
    forecastGeneration: float
    error: Optional[float] = None
    isCutoffSelected: bool = False

class ForecastEvolution(BaseModel):
    targetStartTime: str
    actualGeneration: Optional[float] = None
    revisions: List[ForecastRevision]

class ComparisonResponse(BaseModel):
    dateFrom: str
    dateTo: str
    cutoffMode: str
    cutoffDescription: str
    alignmentMode: str
    metrics: AccuracyMetrics
    records: List[MatchedRecord]
    distribution: List[ErrorBin]

class SummaryResponse(BaseModel):
    totalPeriods: int
    totalDays: int
    dateRange: Dict[str, str]
    cutoffMode: str
    cutoffDescription: str
    alignmentMode: str
    metrics: AccuracyMetrics
    bestDay: Optional[DailyAccuracy] = None
    worstDay: Optional[DailyAccuracy] = None
    worstOverestimation: Optional[MatchedRecord] = None
    worstUnderestimation: Optional[MatchedRecord] = None
    distribution: List[ErrorBin]
