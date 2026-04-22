import os
import ssl

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

_url = (
    os.environ["DATABASE_URL"]
    .replace("postgresql://", "postgresql+pg8000://", 1)
    .replace("postgresql+psycopg2://", "postgresql+pg8000://", 1)
    .replace("?sslmode=require", "")
)

_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

engine = create_engine(_url, connect_args={"ssl_context": _ssl_ctx}, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401 — register models

    Base.metadata.create_all(bind=engine)
