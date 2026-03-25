# -*- coding: utf-8 -*-
"""
RDS 동기화 모듈
로컬 SQLite 데이터를 AWS RDS PostgreSQL에 동기화
"""

import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from typing import Optional, Dict, Any, List
from app.config import settings


def get_rds_connection():
    """RDS 연결 생성"""
    if not settings.rds_enabled:
        return None

    try:
        conn = psycopg2.connect(
            host=settings.rds_host,
            port=settings.rds_port,
            database=settings.rds_database,
            user=settings.rds_user,
            password=settings.rds_password,
            connect_timeout=5
        )
        return conn
    except Exception as e:
        print(f"[RDS] Connection failed: {e}")
        return None


def sync_batch_to_rds(batch_data: Dict[str, Any]) -> Optional[int]:
    """배치 데이터를 RDS에 동기화"""
    conn = get_rds_connection()
    if not conn:
        return None

    try:
        cur = conn.cursor()

        # UPSERT: 로컬 ID 기준으로 처리
        cur.execute("""
            INSERT INTO pickling_batches (
                id, tank_id, status, start_time, end_time,
                cultivar, avg_weight, firmness, leaf_thickness, cabbage_size, total_quantity,
                room_temp, outdoor_temp, season, initial_salinity, initial_water_temp,
                final_cabbage_salinity, washing_salinity, bend_test, spiciness, output_quantity, quality_grade, notes,
                wash1_top_salinity, wash1_bottom_salinity, wash1_water_temp,
                wash2_top_salinity, wash2_bottom_salinity, wash2_water_temp,
                wash3_top_salinity, wash3_bottom_salinity, wash3_water_temp,
                duration_hours, salinity_drop, salinity_drop_rate, vant_hoff_osmotic, weight_firmness, wash_salinity_drop,
                collected_at
            ) VALUES (
                %(id)s, %(tank_id)s, %(status)s, %(start_time)s, %(end_time)s,
                %(cultivar)s, %(avg_weight)s, %(firmness)s, %(leaf_thickness)s, %(cabbage_size)s, %(total_quantity)s,
                %(room_temp)s, %(outdoor_temp)s, %(season)s, %(initial_salinity)s, %(initial_water_temp)s,
                %(final_cabbage_salinity)s, %(washing_salinity)s, %(bend_test)s, %(spiciness)s, %(output_quantity)s, %(quality_grade)s, %(notes)s,
                %(wash1_top_salinity)s, %(wash1_bottom_salinity)s, %(wash1_water_temp)s,
                %(wash2_top_salinity)s, %(wash2_bottom_salinity)s, %(wash2_water_temp)s,
                %(wash3_top_salinity)s, %(wash3_bottom_salinity)s, %(wash3_water_temp)s,
                %(duration_hours)s, %(salinity_drop)s, %(salinity_drop_rate)s, %(vant_hoff_osmotic)s, %(weight_firmness)s, %(wash_salinity_drop)s,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                status = EXCLUDED.status,
                end_time = EXCLUDED.end_time,
                final_cabbage_salinity = EXCLUDED.final_cabbage_salinity,
                washing_salinity = EXCLUDED.washing_salinity,
                bend_test = EXCLUDED.bend_test,
                spiciness = EXCLUDED.spiciness,
                output_quantity = EXCLUDED.output_quantity,
                quality_grade = EXCLUDED.quality_grade,
                notes = EXCLUDED.notes,
                wash1_top_salinity = EXCLUDED.wash1_top_salinity,
                wash1_bottom_salinity = EXCLUDED.wash1_bottom_salinity,
                wash1_water_temp = EXCLUDED.wash1_water_temp,
                wash2_top_salinity = EXCLUDED.wash2_top_salinity,
                wash2_bottom_salinity = EXCLUDED.wash2_bottom_salinity,
                wash2_water_temp = EXCLUDED.wash2_water_temp,
                wash3_top_salinity = EXCLUDED.wash3_top_salinity,
                wash3_bottom_salinity = EXCLUDED.wash3_bottom_salinity,
                wash3_water_temp = EXCLUDED.wash3_water_temp,
                duration_hours = EXCLUDED.duration_hours,
                salinity_drop = EXCLUDED.salinity_drop,
                salinity_drop_rate = EXCLUDED.salinity_drop_rate,
                vant_hoff_osmotic = EXCLUDED.vant_hoff_osmotic,
                weight_firmness = EXCLUDED.weight_firmness,
                wash_salinity_drop = EXCLUDED.wash_salinity_drop,
                collected_at = CURRENT_TIMESTAMP
            RETURNING id
        """, batch_data)

        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        print(f"[RDS] Batch synced: id={batch_data.get('id')}")
        return result[0] if result else None

    except Exception as e:
        print(f"[RDS] Batch sync failed: {e}")
        conn.rollback()
        conn.close()
        return None


def sync_measurement_to_rds(measurement_data: Dict[str, Any]) -> Optional[int]:
    """측정 데이터를 RDS에 동기화"""
    conn = get_rds_connection()
    if not conn:
        return None

    try:
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO pickling_measurements (
                id, batch_id, timestamp, elapsed_minutes,
                salinity_top, salinity_bottom, water_temp, ph,
                added_salt, added_salt_amount, memo,
                salinity_avg, salinity_diff, osmotic_index, accumulated_temp,
                collected_at
            ) VALUES (
                %(id)s, %(batch_id)s, %(timestamp)s, %(elapsed_minutes)s,
                %(salinity_top)s, %(salinity_bottom)s, %(water_temp)s, %(ph)s,
                %(added_salt)s, %(added_salt_amount)s, %(memo)s,
                %(salinity_avg)s, %(salinity_diff)s, %(osmotic_index)s, %(accumulated_temp)s,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                salinity_top = EXCLUDED.salinity_top,
                salinity_bottom = EXCLUDED.salinity_bottom,
                water_temp = EXCLUDED.water_temp,
                ph = EXCLUDED.ph,
                added_salt = EXCLUDED.added_salt,
                added_salt_amount = EXCLUDED.added_salt_amount,
                memo = EXCLUDED.memo,
                salinity_avg = EXCLUDED.salinity_avg,
                salinity_diff = EXCLUDED.salinity_diff,
                osmotic_index = EXCLUDED.osmotic_index,
                accumulated_temp = EXCLUDED.accumulated_temp,
                collected_at = CURRENT_TIMESTAMP
            RETURNING id
        """, measurement_data)

        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        print(f"[RDS] Measurement synced: id={measurement_data.get('id')}")
        return result[0] if result else None

    except Exception as e:
        print(f"[RDS] Measurement sync failed: {e}")
        conn.rollback()
        conn.close()
        return None


def sync_wash_record_to_rds(wash_data: Dict[str, Any]) -> Optional[int]:
    """세척 기록을 RDS에 동기화"""
    conn = get_rds_connection()
    if not conn:
        return None

    try:
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO pickling_wash_records (
                id, batch_id, tank_id, wash_cycle, timestamp,
                salinity_top, salinity_bottom, water_temp, ph,
                salinity_avg, salinity_diff, memo,
                collected_at
            ) VALUES (
                %(id)s, %(batch_id)s, %(tank_id)s, %(wash_cycle)s, %(timestamp)s,
                %(salinity_top)s, %(salinity_bottom)s, %(water_temp)s, %(ph)s,
                %(salinity_avg)s, %(salinity_diff)s, %(memo)s,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                salinity_top = EXCLUDED.salinity_top,
                salinity_bottom = EXCLUDED.salinity_bottom,
                water_temp = EXCLUDED.water_temp,
                ph = EXCLUDED.ph,
                salinity_avg = EXCLUDED.salinity_avg,
                salinity_diff = EXCLUDED.salinity_diff,
                memo = EXCLUDED.memo,
                collected_at = CURRENT_TIMESTAMP
            RETURNING id
        """, wash_data)

        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        print(f"[RDS] Wash record synced: id={wash_data.get('id')}")
        return result[0] if result else None

    except Exception as e:
        print(f"[RDS] Wash record sync failed: {e}")
        conn.rollback()
        conn.close()
        return None


def batch_to_dict(batch) -> Dict[str, Any]:
    """SQLAlchemy Batch 모델을 dict로 변환"""
    return {
        'id': batch.id,
        'tank_id': batch.tank_id,
        'status': batch.status,
        'start_time': batch.start_time,
        'end_time': batch.end_time,
        'cultivar': batch.cultivar,
        'avg_weight': batch.avg_weight,
        'firmness': batch.firmness,
        'leaf_thickness': batch.leaf_thickness,
        'cabbage_size': batch.cabbage_size,
        'total_quantity': batch.total_quantity,
        'room_temp': batch.room_temp,
        'outdoor_temp': batch.outdoor_temp,
        'season': batch.season,
        'initial_salinity': batch.initial_salinity,
        'initial_water_temp': batch.initial_water_temp,
        'final_cabbage_salinity': batch.final_cabbage_salinity,
        'washing_salinity': batch.washing_salinity,
        'bend_test': batch.bend_test,
        'spiciness': batch.spiciness,
        'output_quantity': batch.output_quantity,
        'quality_grade': batch.quality_grade,
        'notes': batch.notes,
        'wash1_top_salinity': batch.wash1_top_salinity,
        'wash1_bottom_salinity': batch.wash1_bottom_salinity,
        'wash1_water_temp': batch.wash1_water_temp,
        'wash2_top_salinity': batch.wash2_top_salinity,
        'wash2_bottom_salinity': batch.wash2_bottom_salinity,
        'wash2_water_temp': batch.wash2_water_temp,
        'wash3_top_salinity': batch.wash3_top_salinity,
        'wash3_bottom_salinity': batch.wash3_bottom_salinity,
        'wash3_water_temp': batch.wash3_water_temp,
        'duration_hours': batch.duration_hours,
        'salinity_drop': batch.salinity_drop,
        'salinity_drop_rate': batch.salinity_drop_rate,
        'vant_hoff_osmotic': batch.vant_hoff_osmotic,
        'weight_firmness': batch.weight_firmness,
        'wash_salinity_drop': batch.wash_salinity_drop,
    }


def measurement_to_dict(measurement) -> Dict[str, Any]:
    """SQLAlchemy Measurement 모델을 dict로 변환"""
    return {
        'id': measurement.id,
        'batch_id': measurement.batch_id,
        'timestamp': measurement.timestamp,
        'elapsed_minutes': measurement.elapsed_minutes,
        'salinity_top': measurement.salinity_top,
        'salinity_bottom': measurement.salinity_bottom,
        'water_temp': measurement.water_temp,
        'ph': measurement.ph,
        'added_salt': measurement.added_salt,
        'added_salt_amount': measurement.added_salt_amount,
        'memo': measurement.memo,
        'salinity_avg': measurement.salinity_avg,
        'salinity_diff': measurement.salinity_diff,
        'osmotic_index': measurement.osmotic_index,
        'accumulated_temp': measurement.accumulated_temp,
    }


def wash_record_to_dict(wash_record) -> Dict[str, Any]:
    """SQLAlchemy WashRecord 모델을 dict로 변환"""
    return {
        'id': wash_record.id,
        'batch_id': wash_record.batch_id,
        'tank_id': wash_record.tank_id,
        'wash_cycle': wash_record.wash_cycle,
        'timestamp': wash_record.timestamp,
        'salinity_top': wash_record.salinity_top,
        'salinity_bottom': wash_record.salinity_bottom,
        'water_temp': wash_record.water_temp,
        'ph': wash_record.ph,
        'salinity_avg': wash_record.salinity_avg,
        'salinity_diff': wash_record.salinity_diff,
        'memo': wash_record.memo,
    }
