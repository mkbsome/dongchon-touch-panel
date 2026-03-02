from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# SQLite-specific settings
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite specific
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables and seed data"""
    from app.models import Batch, Measurement, Tank, TankType, WashRecord

    Base.metadata.create_all(bind=engine)

    # Seed tanks if not exist
    db = SessionLocal()
    try:
        existing_tanks = db.query(Tank).count()
        if existing_tanks == 0:
            # 절임조 7개
            pickling_tanks = [
                Tank(name=f"절임조 {i}", tank_type=TankType.PICKLING.value, tank_number=i)
                for i in range(1, 8)
            ]
            # 세척조 1개
            washing_tanks = [
                Tank(name="세척조", tank_type=TankType.WASHING.value, tank_number=1)
            ]
            db.add_all(pickling_tanks + washing_tanks)
            db.commit()
            print("Seeded 7 pickling tanks and 1 washing tank")
    finally:
        db.close()
