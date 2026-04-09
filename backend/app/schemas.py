from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ============ Tank Schemas ============
class TankBase(BaseModel):
    name: str
    tank_type: str = "pickling"  # pickling or washing
    tank_number: int


class TankCreate(TankBase):
    pass


class TankResponse(TankBase):
    id: int

    class Config:
        from_attributes = True


class WashTankStatus(BaseModel):
    """Status for wash tanks"""
    id: int
    tank_number: int
    name: str
    current_batch_id: Optional[int] = None  # 현재 세척 중인 배치
    last_wash_time: Optional[str] = None


# ============ Batch Schemas ============
class BatchCreate(BaseModel):
    tank_id: int
    cultivar: str
    avg_weight: Optional[float] = 3.0
    firmness: Optional[float] = 0
    leaf_thickness: Optional[int] = 3
    cabbage_size: Optional[str] = None
    total_quantity: Optional[float] = 500
    room_temp: Optional[float] = 15
    outdoor_temp: Optional[float] = None
    season: Optional[str] = None
    initial_salinity: Optional[float] = None
    initial_water_temp: Optional[float] = None  # Added


class BatchFinish(BaseModel):
    tank_id: int
    final_cabbage_salinity: Optional[float] = None
    washing_salinity: Optional[float] = None
    bend_test: Optional[int] = None
    spiciness: Optional[float] = None
    output_quantity: Optional[float] = None
    quality_grade: Optional[str] = None
    notes: Optional[str] = None
    # Wash data (3 cycles)
    wash1_top_salinity: Optional[float] = None
    wash1_bottom_salinity: Optional[float] = None
    wash1_water_temp: Optional[float] = None
    wash2_top_salinity: Optional[float] = None
    wash2_bottom_salinity: Optional[float] = None
    wash2_water_temp: Optional[float] = None
    wash3_top_salinity: Optional[float] = None
    wash3_bottom_salinity: Optional[float] = None
    wash3_water_temp: Optional[float] = None


class BatchResponse(BaseModel):
    id: int
    tank_id: int
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    cultivar: str
    avg_weight: float
    firmness: float
    leaf_thickness: int
    cabbage_size: Optional[str] = None
    total_quantity: Optional[float] = None
    room_temp: float
    outdoor_temp: Optional[float] = None
    season: str
    initial_salinity: float
    initial_water_temp: Optional[float] = None
    final_cabbage_salinity: Optional[float] = None
    washing_salinity: Optional[float] = None
    bend_test: Optional[int] = None
    spiciness: Optional[float] = None
    output_quantity: Optional[float] = None
    quality_grade: Optional[str] = None
    notes: Optional[str] = None
    # Wash data (3 cycles)
    wash1_top_salinity: Optional[float] = None
    wash1_bottom_salinity: Optional[float] = None
    wash1_water_temp: Optional[float] = None
    wash2_top_salinity: Optional[float] = None
    wash2_bottom_salinity: Optional[float] = None
    wash2_water_temp: Optional[float] = None
    wash3_top_salinity: Optional[float] = None
    wash3_bottom_salinity: Optional[float] = None
    wash3_water_temp: Optional[float] = None
    # Derived variables (calculated at batch finish - per design doc)
    duration_hours: Optional[float] = None
    salinity_drop: Optional[float] = None
    salinity_drop_rate: Optional[float] = None
    vant_hoff_osmotic: Optional[float] = None
    weight_firmness: Optional[float] = None
    wash_salinity_drop: Optional[float] = None

    class Config:
        from_attributes = True


class TankStatus(BaseModel):
    active: bool
    cultivar: Optional[str] = None
    start_time: Optional[str] = None
    batch_id: Optional[int] = None
    avg_weight: Optional[float] = None
    total_quantity: Optional[float] = None
    cabbage_size: Optional[str] = None
    initial_salinity: Optional[float] = None


# ============ Measurement Schemas ============
class MeasurementCreate(BaseModel):
    tank_id: int
    salinity_top: Optional[float] = None
    salinity_bottom: Optional[float] = None
    water_temp: Optional[float] = None
    ph: Optional[float] = None  # Added
    added_salt: Optional[bool] = False
    added_salt_amount: Optional[float] = None
    memo: Optional[str] = None


class MeasurementResponse(BaseModel):
    id: int
    batch_id: int
    timestamp: datetime
    elapsed_minutes: int
    salinity_top: Optional[float] = None
    salinity_bottom: Optional[float] = None
    water_temp: Optional[float] = None
    ph: Optional[float] = None
    added_salt: bool
    added_salt_amount: Optional[float] = None
    memo: Optional[str] = None
    # Derived variables (calculated automatically - per design doc)
    salinity_avg: Optional[float] = None
    salinity_diff: Optional[float] = None
    osmotic_index: Optional[float] = None  # 설계서 명칭
    accumulated_temp: Optional[float] = None

    class Config:
        from_attributes = True


# ============ Wash Record Schemas ============
class WashRecordCreate(BaseModel):
    batch_id: int
    wash_tank_id: int  # 세척조 ID
    wash_cycle: int  # 1, 2, 3, ...n
    salinity_top: Optional[float] = None
    salinity_bottom: Optional[float] = None
    water_temp: Optional[float] = None
    ph: Optional[float] = None
    memo: Optional[str] = None


class WashRecordResponse(BaseModel):
    id: int
    batch_id: int
    tank_id: int
    wash_cycle: int
    timestamp: datetime
    salinity_top: Optional[float] = None
    salinity_bottom: Optional[float] = None
    water_temp: Optional[float] = None
    ph: Optional[float] = None
    salinity_avg: Optional[float] = None
    salinity_diff: Optional[float] = None
    memo: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Export Schemas ============
class MLExportRow(BaseModel):
    batch_id: int
    tank_id: int
    total_pickling_hours: float
    cultivar: str
    cabbage_size: Optional[str]
    avg_weight_kg: float
    firmness: float
    leaf_thickness: int
    room_temp_c: float
    outdoor_temp_c: Optional[float]
    season: str
    initial_salinity_pct: float
    initial_water_temp_c: Optional[float]
    total_added_salt_kg: float
    salt_addition_count: int
    first_salt_addition_minutes: Optional[int]
    # Derived variables (from last measurement)
    final_salinity_avg: Optional[float]
    final_salinity_diff: Optional[float]
    final_accumulated_temp: Optional[float]
    # Result variables
    final_cabbage_salinity_pct: Optional[float]
    bend_test: Optional[int]
    quality_grade: Optional[str]
    # Wash data
    wash1_top_salinity: Optional[float]
    wash1_bottom_salinity: Optional[float]
    wash1_water_temp: Optional[float]
    wash2_top_salinity: Optional[float]
    wash2_bottom_salinity: Optional[float]
    wash2_water_temp: Optional[float]
    wash3_top_salinity: Optional[float]
    wash3_bottom_salinity: Optional[float]
    wash3_water_temp: Optional[float]
