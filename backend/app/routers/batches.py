from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict
from datetime import datetime, timezone, timedelta

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

def get_kst_now():
    """Get current time in KST"""
    return datetime.now(KST).replace(tzinfo=None)

from app.database import get_db
from app.models import Batch, BatchStatus
from app.schemas import BatchCreate, BatchFinish, BatchResponse, TankStatus

router = APIRouter(prefix="/api/batches", tags=["batches"])


def get_current_season() -> str:
    """Determine current season based on month"""
    month = datetime.now().month
    if 3 <= month <= 5:
        return "봄"
    elif 6 <= month <= 8:
        return "여름"
    elif 9 <= month <= 11:
        return "가을"
    return "겨울"


def get_default_salinity(season: str) -> float:
    """Get default salinity based on season"""
    season_salinity = {
        "봄": 11.5,
        "가을": 11.5,
        "여름": 10.5,
        "겨울": 13.5
    }
    return season_salinity.get(season, 12.0)


@router.get("", response_model=Dict[int, TankStatus])
def get_tank_status(db: Session = Depends(get_db)):
    """Get active batches status by tank"""
    active_batches = db.query(Batch).filter(Batch.status == BatchStatus.ACTIVE.value).all()

    tank_status: Dict[int, TankStatus] = {}
    for batch in active_batches:
        tank_status[batch.tank_id] = TankStatus(
            active=True,
            cultivar=batch.cultivar,
            start_time=batch.start_time.isoformat() if batch.start_time else None,
            batch_id=batch.id,
            avg_weight=batch.avg_weight,
            total_quantity=batch.total_quantity,
            cabbage_size=batch.cabbage_size,
            initial_salinity=batch.initial_salinity
        )

    return tank_status


@router.post("", response_model=BatchResponse)
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    """Create a new batch (auto-completes existing active batch for same tank)"""
    # Complete existing active batch for this tank
    existing = db.query(Batch).filter(
        Batch.tank_id == batch_data.tank_id,
        Batch.status == BatchStatus.ACTIVE.value
    ).first()

    if existing:
        existing.status = BatchStatus.COMPLETED.value
        existing.end_time = get_kst_now()

    # Determine season and salinity
    season = batch_data.season or get_current_season()
    initial_salinity = batch_data.initial_salinity or get_default_salinity(season)

    # Create new batch
    new_batch = Batch(
        tank_id=batch_data.tank_id,
        cultivar=batch_data.cultivar,
        avg_weight=batch_data.avg_weight or 3.0,
        firmness=batch_data.firmness or 0,
        leaf_thickness=batch_data.leaf_thickness or 3,
        cabbage_size=batch_data.cabbage_size,
        total_quantity=batch_data.total_quantity or 500,
        room_temp=batch_data.room_temp or 15,
        outdoor_temp=batch_data.outdoor_temp,
        season=season,
        initial_salinity=initial_salinity,
        initial_water_temp=batch_data.initial_water_temp,
        status=BatchStatus.ACTIVE.value,
        start_time=get_kst_now()
    )

    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)

    return new_batch


@router.get("/completed", response_model=list[BatchResponse])
def get_completed_batches(db: Session = Depends(get_db)):
    """Get all completed batches (sorted by start_time desc)"""
    batches = db.query(Batch).filter(
        Batch.status == BatchStatus.COMPLETED.value
    ).order_by(Batch.start_time.desc()).all()

    return batches


def calculate_batch_derived_variables(batch: Batch, end_time: datetime) -> dict:
    """
    Calculate derived variables at batch finish (per design doc 4_피처엔지니어링.md)

    설계서 기준 파생변수:
    - duration_hours: 절임 시간 (hours)
    - salinity_drop: 염도 감소량 = 초기염도 - 최종염도
    - salinity_drop_rate: 시간당 염도 감소율 = salinity_drop / duration_hours
    - vant_hoff_osmotic: Van't Hoff 삼투압 = initial_salinity * (water_temp + 273.15) / 100 (설계서 4.2.1)
    - weight_firmness: 무게-경도 상호작용 = avg_weight * firmness (설계서 4.2.3)
    - wash_salinity_drop: 세척 효과 = wash1_salinity - wash3_salinity
    """
    result = {
        "duration_hours": None,
        "salinity_drop": None,
        "salinity_drop_rate": None,
        "vant_hoff_osmotic": None,
        "weight_firmness": None,
        "wash_salinity_drop": None,
    }

    # duration_hours: 절임 시간 (시간 단위)
    if batch.start_time:
        duration_seconds = (end_time - batch.start_time).total_seconds()
        result["duration_hours"] = round(duration_seconds / 3600, 2)

    # salinity_drop: 염도 감소량
    if batch.initial_salinity is not None and batch.final_cabbage_salinity is not None:
        result["salinity_drop"] = round(batch.initial_salinity - batch.final_cabbage_salinity, 2)

        # salinity_drop_rate: 시간당 염도 감소율
        if result["duration_hours"] and result["duration_hours"] > 0:
            result["salinity_drop_rate"] = round(result["salinity_drop"] / result["duration_hours"], 4)

    # vant_hoff_osmotic: Van't Hoff 삼투압 (설계서 4.2.1)
    # π = initial_salinity * (water_temp + 273.15) / 100
    water_temp = batch.initial_water_temp or 15.0  # 기본값 15도
    if batch.initial_salinity is not None:
        result["vant_hoff_osmotic"] = round(batch.initial_salinity * (water_temp + 273.15) / 100, 4)

    # weight_firmness: 무게-경도 상호작용 (설계서 4.2.3)
    if batch.avg_weight is not None and batch.firmness is not None:
        result["weight_firmness"] = round(batch.avg_weight * batch.firmness, 4)

    # wash_salinity_drop: 세척 효과
    wash1_avg = None
    wash3_avg = None
    if batch.wash1_top_salinity is not None:
        wash1_avg = batch.wash1_top_salinity
    if batch.wash3_top_salinity is not None:
        wash3_avg = batch.wash3_top_salinity
    if wash1_avg is not None and wash3_avg is not None:
        result["wash_salinity_drop"] = round(wash1_avg - wash3_avg, 2)

    return result


@router.post("/finish", response_model=BatchResponse)
def finish_batch(finish_data: BatchFinish, db: Session = Depends(get_db)):
    """Finish an active batch with result data and calculate derived variables"""
    batch = db.query(Batch).filter(
        Batch.tank_id == finish_data.tank_id,
        Batch.status == BatchStatus.ACTIVE.value
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="No active batch found for this tank")

    # Update batch with finish data
    end_time = get_kst_now()
    batch.status = BatchStatus.COMPLETED.value
    batch.end_time = end_time
    batch.final_cabbage_salinity = finish_data.final_cabbage_salinity
    batch.washing_salinity = finish_data.washing_salinity
    batch.bend_test = finish_data.bend_test
    batch.spiciness = finish_data.spiciness
    batch.output_quantity = finish_data.output_quantity
    batch.quality_grade = finish_data.quality_grade
    batch.notes = finish_data.notes

    # Wash data (3 cycles)
    batch.wash1_top_salinity = finish_data.wash1_top_salinity
    batch.wash1_bottom_salinity = finish_data.wash1_bottom_salinity
    batch.wash1_water_temp = finish_data.wash1_water_temp
    batch.wash2_top_salinity = finish_data.wash2_top_salinity
    batch.wash2_bottom_salinity = finish_data.wash2_bottom_salinity
    batch.wash2_water_temp = finish_data.wash2_water_temp
    batch.wash3_top_salinity = finish_data.wash3_top_salinity
    batch.wash3_bottom_salinity = finish_data.wash3_bottom_salinity
    batch.wash3_water_temp = finish_data.wash3_water_temp

    # Calculate derived variables (per design doc 4_피처엔지니어링.md)
    derived = calculate_batch_derived_variables(batch, end_time)
    batch.duration_hours = derived["duration_hours"]
    batch.salinity_drop = derived["salinity_drop"]
    batch.salinity_drop_rate = derived["salinity_drop_rate"]
    batch.vant_hoff_osmotic = derived["vant_hoff_osmotic"]
    batch.weight_firmness = derived["weight_firmness"]
    batch.wash_salinity_drop = derived["wash_salinity_drop"]

    db.commit()
    db.refresh(batch)

    return batch
