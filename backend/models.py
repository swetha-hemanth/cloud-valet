from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    BigInteger,
    Text,
    ForeignKey
)

from database import Base


# ============================================================
# USER
# ============================================================

class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String,
        nullable=False
    )


# ============================================================
# FILE
# ============================================================

class FileRecord(Base):

    __tablename__ = "files"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    name = Column(
        String,
        nullable=False
    )

    stored_name = Column(
        String,
        nullable=False
    )

    size = Column(
        BigInteger,
        default=0
    )

    content_type = Column(
        String,
        default="application/octet-stream"
    )

    starred = Column(
        Boolean,
        default=False
    )

    trashed = Column(
        Boolean,
        default=False
    )

    locked = Column(
        Boolean,
        default=False
    )

    shared = Column(
        Boolean,
        default=False
    )

    shared_with = Column(
        Text,
        default="[]"
    )

    uploaded_at = Column(
        String
    )

    modified_at = Column(
        String
    )


# ============================================================
# FOLDER
# ============================================================

class FolderRecord(Base):

    __tablename__ = "folders"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    name = Column(
        String,
        nullable=False
    )

    locked = Column(
        Boolean,
        default=False
    )

    trashed = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        String
    )
class ActivityLog(Base):
    

    __tablename__ = "activity_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    action = Column(
        String,
        nullable=False
    )

    file_name = Column(
        String,
        nullable=True
    )

    details = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        String,
        nullable=False
    )