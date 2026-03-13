from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
import enum

from app.database import Base

# 한국 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

def get_kst_now():
    """Get current time in KST"""
    return datetime.now(KST).replace(tzinfo=None)


class BatchStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"


class TankType(str, enum.Enum):
    PICKLING = "pickling"  # 절임조
    WASHING = "washing"    # 세척조


class Tank(Base):
    """Tank (절임조 or 세척조)"""
    __tablename__ = "tanks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    tank_type = Column(String(20), default=TankType.PICKLING.value)  # pickling or washing
    tank_number = Column(Integer, nullable=False)  # 1-7 for pickling, 1-3 for washing

    batches = relationship("Batch", back_populates="tank")
    wash_records = relationship("WashRecord", back_populates="tank")


class Batch(Base):
    """Batch information (input at batch start)"""
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tank_id = Column(Integer, ForeignKey("tanks.id"), nullable=False)
    status = Column(String(20), default=BatchStatus.ACTIVE.value)

    # Time info
    start_time = Column(DateTime, default=get_kst_now)
    end_time = Column(DateTime, nullable=True)

    # Cabbage characteristics (X: uncontrollable)
    cultivar = Column(String(100), nullable=False)  # Variety
    avg_weight = Column(Float, default=3.0)  # Average weight (kg)
    firmness = Column(Float, default=0)  # Firmness (sensor value)
    leaf_thickness = Column(Integer, default=3)  # Leaf thickness (1-5)
    cabbage_size = Column(String(10), nullable=True)  # Size (S/M/L/XL)
    total_quantity = Column(Float, default=500)  # Input quantity (kg)

    # Environment info (X': partially controllable)
    room_temp = Column(Float, default=15)  # Room temperature (C)
    outdoor_temp = Column(Float, nullable=True)  # Outdoor temperature (C)
    season = Column(String(20))  # Season
    initial_salinity = Column(Float)  # Initial salinity (%) - Z: controllable!
    initial_water_temp = Column(Float, nullable=True)  # Initial water temperature (C)

    # End-of-batch input (Y: result variables)
    final_cabbage_salinity = Column(Float, nullable=True)  # Final cabbage salinity (%)
    washing_salinity = Column(Float, nullable=True)  # Washing tank salinity (%)
    bend_test = Column(Integer, nullable=True)  # Sensory evaluation - bend (1-5)
    spiciness = Column(Float, nullable=True)  # Spiciness
    output_quantity = Column(Float, nullable=True)  # Output quantity (kg)
    quality_grade = Column(String(10), nullable=True)  # Quality grade
    notes = Column(Text, nullable=True)  # Notes

    # Wash data (3 cycles) - stored in batch for ML export convenience
    wash1_top_salinity = Column(Float, nullable=True)
    wash1_bottom_salinity = Column(Float, nullable=True)
    wash1_water_temp = Column(Float, nullable=True)
    wash2_top_salinity = Column(Float, nullable=True)
    wash2_bottom_salinity = Column(Float, nullable=True)
    wash2_water_temp = Column(Float, nullable=True)
    wash3_top_salinity = Column(Float, nullable=True)
    wash3_bottom_salinity = Column(Float, nullable=True)
    wash3_water_temp = Column(Float, nullable=True)

    # Derived variables (calculated at batch finish - per design doc)
    duration_hours = Column(Float, nullable=True)  # 절임 시간 (hours)
    salinity_drop = Column(Float, nullable=True)  # 염도 감소량 (초기염도 - 최종염도)
    salinity_drop_rate = Column(Float, nullable=True)  # 시간당 염도 감소율
    vant_hoff_osmotic = Column(Float, nullable=True)  # Van't Hoff 삼투압 = initial_salinity * (water_temp + 273.15) / 100
    weight_firmness = Column(Float, nullable=True)  # 무게-경도 상호작용 = avg_weight * firmness
    wash_salinity_drop = Column(Float, nullable=True)  # 세척 효과 = wash1_salinity - wash3_salinity

    # Relationships
    tank = relationship("Tank", back_populates="batches")
    measurements = relationship("Measurement", back_populates="batch", cascade="all, delete-orphan")
    wash_records = relationship("WashRecord", back_populates="batch", cascade="all, delete-orphan")


class Measurement(Base):
    """Measurement records (during process - manual trigger)"""
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    timestamp = Column(DateTime, default=get_kst_now)
    elapsed_minutes = Column(Integer, default=0)  # Minutes since batch start

    # Salinity measurements (monitoring)
    salinity_top = Column(Float, nullable=True)  # Top salinity (%)
    salinity_bottom = Column(Float, nullable=True)  # Bottom salinity (%)

    # Water temperature (monitoring)
    water_temp = Column(Float, nullable=True)  # Water temperature (C)

    # pH value (optional)
    ph = Column(Float, nullable=True)  # pH value

    # Added salt - Z: controllable variable (key!)
    added_salt = Column(Boolean, default=False)  # Salt added?
    added_salt_amount = Column(Float, nullable=True)  # Salt amount (kg)

    memo = Column(Text, nullable=True)  # Notes

    # Derived variables (calculated automatically for ML - per design doc)
    salinity_avg = Column(Float, nullable=True)  # Average salinity (%)
    salinity_diff = Column(Float, nullable=True)  # Salinity difference |top - bottom|
    osmotic_index = Column(Float, nullable=True)  # 삼투압 지수 = salinity_avg * water_temp
    accumulated_temp = Column(Float, nullable=True)  # Accumulated temperature (C*hours)

    # Relationships
    batch = relationship("Batch", back_populates="measurements")


class WashRecord(Base):
    """Wash records - 세척 기록 (배치별, 세척조별)"""
    __tablename__ = "wash_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    tank_id = Column(Integer, ForeignKey("tanks.id"), nullable=False)  # 세척조 ID
    wash_cycle = Column(Integer, nullable=False)  # 1, 2, 3 (세척 회차)
    timestamp = Column(DateTime, default=get_kst_now)

    # Wash measurements
    salinity_top = Column(Float, nullable=True)  # 상단 염도 (%)
    salinity_bottom = Column(Float, nullable=True)  # 하단 염도 (%)
    water_temp = Column(Float, nullable=True)  # 물 온도 (C)
    ph = Column(Float, nullable=True)  # pH 값

    # Derived variables for ML
    salinity_avg = Column(Float, nullable=True)  # 평균 염도
    salinity_diff = Column(Float, nullable=True)  # 염도 차이

    memo = Column(Text, nullable=True)

    # Relationships
    batch = relationship("Batch", back_populates="wash_records")
    tank = relationship("Tank", back_populates="wash_records")
