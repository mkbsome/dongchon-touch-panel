from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

def get_kst_now():
    """Get current time in KST"""
    return datetime.now(KST).replace(tzinfo=None)

from app.database import get_db
from app.models import Batch, Measurement, BatchStatus
from app.schemas import MeasurementCreate, MeasurementResponse
from app.rds_sync import sync_measurement_to_rds, measurement_to_dict

router = APIRouter(prefix="/api/measurements", tags=["measurements"])


def calculate_derived_variables(
    salinity_top: float | None,
    salinity_bottom: float | None,
    water_temp: float | None,
    previous_measurements: list[Measurement],
    batch_start_time: datetime
) -> dict:
    """
    Calculate derived variables for ML training (per design doc 4_피처엔지니어링.md)

    설계서 기준 파생변수:
    - salinity_avg: 평균 염도 = (상부 + 하부) / 2
    - salinity_diff: 염도 차이 = |상부 - 하부|
    - osmotic_index: 삼투압 지수 = salinity_avg * water_temp (설계서 4.2.2)
    - accumulated_temp: 적산 온도 = Σ(평균온도 * 시간)
    """
    result = {
        "salinity_avg": None,
        "salinity_diff": None,
        "osmotic_index": None,  # 설계서 명칭으로 변경 (osmotic_pressure_index → osmotic_index)
        "accumulated_temp": 0.0
    }

    # Calculate basic derived variables
    if salinity_top is not None and salinity_bottom is not None:
        result["salinity_avg"] = (salinity_top + salinity_bottom) / 2
        result["salinity_diff"] = abs(salinity_top - salinity_bottom)

        # osmotic_index = salinity_avg * water_temp (설계서 4.2.2)
        if water_temp is not None:
            result["osmotic_index"] = result["salinity_avg"] * water_temp

    # Calculate accumulated temperature
    # Formula: sum of (avg_temp * hours) for each interval
    now = get_kst_now()

    if previous_measurements:
        # Get the last measurement
        last_meas = previous_measurements[-1]
        last_time = last_meas.timestamp
        diff_hours = (now - last_time).total_seconds() / 3600

        # Get previous accumulated temp (or 0 if not set)
        last_acc = last_meas.accumulated_temp or 0

        # Get temperatures for averaging
        last_temp = last_meas.water_temp or water_temp or 0
        curr_temp = water_temp or last_temp

        # Add this interval's contribution
        result["accumulated_temp"] = last_acc + ((last_temp + curr_temp) / 2 * diff_hours)
    else:
        # First measurement - calculate from batch start
        if water_temp is not None:
            diff_hours = (now - batch_start_time).total_seconds() / 3600
            result["accumulated_temp"] = water_temp * diff_hours

    return result


@router.get("", response_model=list[MeasurementResponse])
def get_measurements(batch_id: int, db: Session = Depends(get_db)):
    """Get all measurements for a specific batch"""
    measurements = db.query(Measurement).filter(
        Measurement.batch_id == batch_id
    ).order_by(Measurement.timestamp.asc()).all()

    return measurements


@router.post("", response_model=MeasurementResponse)
def create_measurement(measurement_data: MeasurementCreate, db: Session = Depends(get_db)):
    """Create a new measurement for an active batch with derived variables"""
    # Find active batch for the tank
    active_batch = db.query(Batch).filter(
        Batch.tank_id == measurement_data.tank_id,
        Batch.status == BatchStatus.ACTIVE.value
    ).first()

    if not active_batch:
        raise HTTPException(status_code=404, detail="No active batch for this tank")

    # Get previous measurements for accumulated temp calculation
    previous_measurements = db.query(Measurement).filter(
        Measurement.batch_id == active_batch.id
    ).order_by(Measurement.timestamp.asc()).all()

    # Calculate derived variables
    derived = calculate_derived_variables(
        salinity_top=measurement_data.salinity_top,
        salinity_bottom=measurement_data.salinity_bottom,
        water_temp=measurement_data.water_temp,
        previous_measurements=previous_measurements,
        batch_start_time=active_batch.start_time
    )

    # Calculate elapsed time
    now = get_kst_now()
    elapsed_minutes = int((now - active_batch.start_time).total_seconds() / 60)

    # Create measurement with derived variables
    new_measurement = Measurement(
        batch_id=active_batch.id,
        timestamp=now,
        elapsed_minutes=elapsed_minutes,
        salinity_top=measurement_data.salinity_top,
        salinity_bottom=measurement_data.salinity_bottom,
        water_temp=measurement_data.water_temp,
        ph=measurement_data.ph,
        added_salt=measurement_data.added_salt or False,
        added_salt_amount=measurement_data.added_salt_amount,
        memo=measurement_data.memo,
        # Derived variables (calculated automatically - per design doc)
        salinity_avg=derived["salinity_avg"],
        salinity_diff=derived["salinity_diff"],
        osmotic_index=derived["osmotic_index"],
        accumulated_temp=derived["accumulated_temp"]
    )

    db.add(new_measurement)
    db.commit()
    db.refresh(new_measurement)

    # RDS 동기화
    sync_measurement_to_rds(measurement_to_dict(new_measurement))

    return new_measurement
