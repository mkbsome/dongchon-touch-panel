from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
from datetime import datetime, timezone, timedelta

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

def get_kst_now():
    """Get current time in KST"""
    return datetime.now(KST).replace(tzinfo=None)

from app.database import get_db
from app.models import Tank, TankType, Batch, BatchStatus, WashRecord
from app.schemas import WashRecordCreate, WashRecordResponse, WashTankStatus

router = APIRouter(prefix="/api/wash", tags=["wash"])


@router.get("/tanks")
def get_wash_tanks(db: Session = Depends(get_db)) -> Dict[int, WashTankStatus]:
    """Get status of all wash tanks (세척조 1-3)"""
    wash_tanks = db.query(Tank).filter(
        Tank.tank_type == TankType.WASHING.value
    ).all()

    # If no wash tanks exist, create one
    if not wash_tanks:
        tank = Tank(
            name="세척조",
            tank_type=TankType.WASHING.value,
            tank_number=1
        )
        db.add(tank)
        db.commit()
        wash_tanks = db.query(Tank).filter(
            Tank.tank_type == TankType.WASHING.value
        ).all()

    result = {}
    for tank in wash_tanks:
        # Get last wash record for this tank
        last_wash = db.query(WashRecord).filter(
            WashRecord.tank_id == tank.id
        ).order_by(WashRecord.timestamp.desc()).first()

        result[tank.tank_number] = WashTankStatus(
            id=tank.id,
            tank_number=tank.tank_number,
            name=tank.name,
            current_batch_id=last_wash.batch_id if last_wash else None,
            last_wash_time=last_wash.timestamp.isoformat() if last_wash else None
        )

    return result


@router.post("", response_model=WashRecordResponse)
def create_wash_record(wash_data: WashRecordCreate, db: Session = Depends(get_db)):
    """Create a wash record for a batch"""
    # Verify batch exists and is active
    batch = db.query(Batch).filter(Batch.id == wash_data.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Verify wash tank exists
    wash_tank = db.query(Tank).filter(
        Tank.id == wash_data.wash_tank_id,
        Tank.tank_type == TankType.WASHING.value
    ).first()
    if not wash_tank:
        raise HTTPException(status_code=404, detail="Wash tank not found")

    # Calculate derived variables
    salinity_avg = None
    salinity_diff = None
    if wash_data.salinity_top is not None and wash_data.salinity_bottom is not None:
        salinity_avg = (wash_data.salinity_top + wash_data.salinity_bottom) / 2
        salinity_diff = abs(wash_data.salinity_top - wash_data.salinity_bottom)

    # Create wash record
    wash_record = WashRecord(
        batch_id=wash_data.batch_id,
        tank_id=wash_data.wash_tank_id,
        wash_cycle=wash_data.wash_cycle,
        salinity_top=wash_data.salinity_top,
        salinity_bottom=wash_data.salinity_bottom,
        water_temp=wash_data.water_temp,
        ph=wash_data.ph,
        salinity_avg=salinity_avg,
        salinity_diff=salinity_diff,
        memo=wash_data.memo,
        timestamp=get_kst_now()
    )

    db.add(wash_record)
    db.commit()
    db.refresh(wash_record)

    return wash_record


@router.get("/batch/{batch_id}", response_model=List[WashRecordResponse])
def get_wash_records_for_batch(batch_id: int, db: Session = Depends(get_db)):
    """Get all wash records for a specific batch"""
    records = db.query(WashRecord).filter(
        WashRecord.batch_id == batch_id
    ).order_by(WashRecord.wash_cycle, WashRecord.timestamp).all()

    return records


@router.get("/tank/{tank_number}", response_model=List[WashRecordResponse])
def get_wash_records_for_tank(tank_number: int, db: Session = Depends(get_db)):
    """Get recent wash records for a specific wash tank"""
    tank = db.query(Tank).filter(
        Tank.tank_number == tank_number,
        Tank.tank_type == TankType.WASHING.value
    ).first()

    if not tank:
        raise HTTPException(status_code=404, detail="Wash tank not found")

    records = db.query(WashRecord).filter(
        WashRecord.tank_id == tank.id
    ).order_by(WashRecord.timestamp.desc()).limit(20).all()

    return records


@router.get("/active-batches")
def get_active_batches(db: Session = Depends(get_db)):
    """Get batches available for wash record (active + recently completed)"""
    # 활성 배치 + 최근 완료된 배치 (오늘 완료된 것)
    from datetime import datetime, timedelta
    today_start = get_kst_now().replace(hour=0, minute=0, second=0, microsecond=0)

    batches = db.query(Batch).filter(
        (Batch.status == BatchStatus.ACTIVE.value) |
        ((Batch.status == BatchStatus.COMPLETED.value) & (Batch.end_time >= today_start))
    ).order_by(Batch.start_time.desc()).all()

    result = []
    for batch in batches:
        # Get pickling tank info
        tank = db.query(Tank).filter(Tank.id == batch.tank_id).first()

        # Get wash record count for this batch
        wash_count = db.query(WashRecord).filter(
            WashRecord.batch_id == batch.id
        ).count()

        # Get next wash cycle
        max_cycle = db.query(WashRecord.wash_cycle).filter(
            WashRecord.batch_id == batch.id
        ).order_by(WashRecord.wash_cycle.desc()).first()
        next_cycle = (max_cycle[0] + 1) if max_cycle else 1

        result.append({
            "batchId": batch.id,
            "tankNumber": tank.tank_number if tank else None,
            "tankName": tank.name if tank else None,
            "cultivar": batch.cultivar,
            "status": batch.status,  # active or completed
            "startTime": batch.start_time.isoformat() if batch.start_time else None,
            "endTime": batch.end_time.isoformat() if batch.end_time else None,
            "washCount": wash_count,
            "nextCycle": next_cycle
        })

    return result
