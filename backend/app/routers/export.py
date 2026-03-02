from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import io

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

def get_kst_now():
    """Get current time in KST"""
    return datetime.now(KST).replace(tzinfo=None)

from app.database import get_db
from app.models import Batch, Measurement, BatchStatus

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("")
def export_csv(type: str = "batches", db: Session = Depends(get_db)):
    """Export data as CSV (batches | measurements | ml)"""
    completed_batches = db.query(Batch).filter(
        Batch.status == BatchStatus.COMPLETED.value
    ).all()

    if not completed_batches:
        raise HTTPException(status_code=404, detail="No completed batches found")

    csv_content = ""
    filename = ""

    if type == "measurements":
        # Measurements detail CSV (for time series analysis) - includes derived variables
        headers = [
            'batch_id', 'measurement_id', 'timestamp', 'elapsed_minutes',
            'salinity_top_pct', 'salinity_bottom_pct', 'water_temp_c', 'ph',
            'added_salt', 'added_salt_amount_kg',
            # Derived variables
            'salinity_avg', 'salinity_diff', 'osmotic_pressure_index', 'accumulated_temp',
            'memo'
        ]

        rows = []
        for batch in completed_batches:
            measurements = db.query(Measurement).filter(
                Measurement.batch_id == batch.id
            ).order_by(Measurement.timestamp.asc()).all()
            for m in measurements:
                rows.append([
                    str(batch.id),
                    str(m.id),
                    m.timestamp.isoformat() if m.timestamp else '',
                    str(m.elapsed_minutes or 0),
                    str(m.salinity_top or ''),
                    str(m.salinity_bottom or ''),
                    str(m.water_temp or ''),
                    str(m.ph or ''),
                    '1' if m.added_salt else '0',
                    str(m.added_salt_amount or 0),
                    # Derived variables
                    str(m.salinity_avg or ''),
                    str(m.salinity_diff or ''),
                    str(m.osmotic_pressure_index or ''),
                    str(m.accumulated_temp or ''),
                    (m.memo or '').replace(',', ';').replace('\n', ' ')
                ])

        csv_content = ','.join(headers) + '\n' + '\n'.join([','.join(r) for r in rows])
        filename = f"measurements_{datetime.now().strftime('%Y-%m-%d')}.csv"

    elif type == "ml":
        # ML training data CSV (batch + aggregated measurements + derived variables)
        headers = [
            'batch_id', 'tank_id', 'total_pickling_hours',
            # Cabbage characteristics (X)
            'cultivar', 'cabbage_size', 'avg_weight_kg', 'firmness', 'leaf_thickness',
            # Environment (X')
            'room_temp_c', 'outdoor_temp_c', 'season',
            # Control variables (Z)
            'initial_salinity_pct', 'initial_water_temp_c',
            'total_added_salt_kg', 'salt_addition_count', 'first_salt_addition_minutes',
            # Derived variables (from last measurement)
            'final_salinity_avg', 'final_salinity_diff', 'final_accumulated_temp',
            # Result variables (Y)
            'final_cabbage_salinity_pct', 'bend_test', 'quality_grade',
            # Wash data
            'wash1_top_salinity', 'wash1_bottom_salinity', 'wash1_water_temp',
            'wash2_top_salinity', 'wash2_bottom_salinity', 'wash2_water_temp',
            'wash3_top_salinity', 'wash3_bottom_salinity', 'wash3_water_temp'
        ]

        rows = []
        for batch in completed_batches:
            measurements = db.query(Measurement).filter(
                Measurement.batch_id == batch.id
            ).order_by(Measurement.timestamp.asc()).all()

            end_time = batch.end_time or get_kst_now()
            total_hours = (end_time - batch.start_time).total_seconds() / 3600

            # Salt aggregation
            salt_additions = [m for m in measurements if m.added_salt]
            total_added_salt = sum(m.added_salt_amount or 0 for m in salt_additions)
            first_salt_time = salt_additions[0].elapsed_minutes if salt_additions else ''

            # Get derived variables from last measurement
            last_meas = measurements[-1] if measurements else None
            final_salinity_avg = last_meas.salinity_avg if last_meas else ''
            final_salinity_diff = last_meas.salinity_diff if last_meas else ''
            final_accumulated_temp = last_meas.accumulated_temp if last_meas else ''

            rows.append([
                str(batch.id),
                str(batch.tank_id),
                f"{total_hours:.2f}",
                # Cabbage characteristics
                batch.cultivar,
                batch.cabbage_size or '',
                str(batch.avg_weight),
                str(batch.firmness),
                str(batch.leaf_thickness),
                # Environment
                str(batch.room_temp),
                str(batch.outdoor_temp or ''),
                batch.season,
                # Control variables
                str(batch.initial_salinity),
                str(batch.initial_water_temp or ''),
                str(total_added_salt),
                str(len(salt_additions)),
                str(first_salt_time),
                # Derived variables
                str(final_salinity_avg or ''),
                str(final_salinity_diff or ''),
                str(final_accumulated_temp or ''),
                # Result variables
                str(batch.final_cabbage_salinity or ''),
                str(batch.bend_test or ''),
                batch.quality_grade or '',
                # Wash data
                str(batch.wash1_top_salinity or ''),
                str(batch.wash1_bottom_salinity or ''),
                str(batch.wash1_water_temp or ''),
                str(batch.wash2_top_salinity or ''),
                str(batch.wash2_bottom_salinity or ''),
                str(batch.wash2_water_temp or ''),
                str(batch.wash3_top_salinity or ''),
                str(batch.wash3_bottom_salinity or ''),
                str(batch.wash3_water_temp or '')
            ])

        csv_content = ','.join(headers) + '\n' + '\n'.join([','.join(r) for r in rows])
        filename = f"ml_training_data_{datetime.now().strftime('%Y-%m-%d')}.csv"

    else:
        # Default: Batch info CSV
        headers = [
            'batch_id', 'tank_id', 'start_time', 'end_time', 'total_pickling_hours',
            'cultivar', 'cabbage_size', 'avg_weight_kg', 'firmness', 'leaf_thickness',
            'room_temp_c', 'outdoor_temp_c', 'season', 'initial_salinity_pct',
            'measurement_count', 'final_cabbage_salinity_pct', 'bend_test',
            'quality_grade', 'notes'
        ]

        rows = []
        for batch in completed_batches:
            measurement_count = db.query(Measurement).filter(
                Measurement.batch_id == batch.id
            ).count()

            end_time = batch.end_time or get_kst_now()
            total_hours = (end_time - batch.start_time).total_seconds() / 3600

            rows.append([
                str(batch.id),
                str(batch.tank_id),
                batch.start_time.isoformat() if batch.start_time else '',
                batch.end_time.isoformat() if batch.end_time else '',
                f"{total_hours:.2f}",
                batch.cultivar,
                batch.cabbage_size or '',
                str(batch.avg_weight),
                str(batch.firmness),
                str(batch.leaf_thickness),
                str(batch.room_temp),
                str(batch.outdoor_temp or ''),
                batch.season,
                str(batch.initial_salinity),
                str(measurement_count),
                str(batch.final_cabbage_salinity or ''),
                str(batch.bend_test or ''),
                batch.quality_grade or '',
                (batch.notes or '').replace(',', ';').replace('\n', ' ')
            ])

        csv_content = ','.join(headers) + '\n' + '\n'.join([','.join(r) for r in rows])
        filename = f"pickling_batches_{datetime.now().strftime('%Y-%m-%d')}.csv"

    # Add BOM for Excel Korean compatibility
    bom = '\ufeff'
    csv_with_bom = bom + csv_content

    return StreamingResponse(
        io.StringIO(csv_with_bom),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
