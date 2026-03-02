from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Batch, Measurement, WashRecord

router = APIRouter()


@router.get("/batches")
def get_all_batches(db: Session = Depends(get_db)):
    """Get all batches for admin view"""
    batches = db.query(Batch).order_by(Batch.start_time.desc()).all()
    return [
        {
            "id": b.id,
            "tank_id": b.tank_id,
            "cultivar": b.cultivar,
            "status": b.status,
            "start_time": b.start_time.isoformat() if b.start_time else None,
            "end_time": b.end_time.isoformat() if b.end_time else None,
            "avg_weight": b.avg_weight,
            "cabbage_size": b.cabbage_size,
            "initial_salinity": b.initial_salinity,
            "final_cabbage_salinity": b.final_cabbage_salinity,
            "bend_test": b.bend_test,
        }
        for b in batches
    ]


@router.get("/measurements")
def get_all_measurements(db: Session = Depends(get_db)):
    """Get all measurements for admin view"""
    measurements = db.query(Measurement).order_by(Measurement.timestamp.desc()).all()
    return [
        {
            "id": m.id,
            "batch_id": m.batch_id,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "salinity_top": m.salinity_top,
            "salinity_bottom": m.salinity_bottom,
            "water_temp": m.water_temp,
            "added_salt": m.added_salt,
            "added_salt_amount": m.added_salt_amount,
        }
        for m in measurements
    ]


@router.get("/wash-records")
def get_all_wash_records(db: Session = Depends(get_db)):
    """Get all wash records for admin view"""
    records = db.query(WashRecord).order_by(WashRecord.timestamp.desc()).all()
    return [
        {
            "id": r.id,
            "batch_id": r.batch_id,
            "wash_cycle": r.wash_cycle,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "salinity_top": r.salinity_top,
            "salinity_bottom": r.salinity_bottom,
            "water_temp": r.water_temp,
            "ph": r.ph,
        }
        for r in records
    ]
