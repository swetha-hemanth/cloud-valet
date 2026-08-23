# ============================================================
# CLOUDVAULT BACKEND
# Azure Blob Storage + JWT + OTP + Activity Logs
# ============================================================

import os
import uuid
import json
import random

from datetime import datetime, timedelta

import bcrypt
import requests

from jose import jwt, JWTError
from dotenv import load_dotenv

from email_validator import (
    validate_email,
    EmailNotValidError
)

from azure.storage.blob import (
    BlobServiceClient,
    ContentSettings
)

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    Header
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from sqlalchemy.orm import Session

import models

from database import (
    engine,
    get_db
)


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# AZURE SETTINGS
# ============================================================

AZURE_CONNECTION_STRING = os.getenv(
    "AZURE_STORAGE_CONNECTION_STRING"
)

AZURE_CONTAINER_NAME = os.getenv(
    "AZURE_CONTAINER_NAME",
    "cloudvault-files"
)


if not AZURE_CONNECTION_STRING:

    raise RuntimeError(
        "AZURE_STORAGE_CONNECTION_STRING missing in .env"
    )


# ============================================================
# EMAIL SETTINGS - BREVO API
# ============================================================

BREVO_API_KEY = os.getenv(
    "BREVO_API_KEY"
)

BREVO_SENDER_EMAIL = os.getenv(
    "BREVO_SENDER_EMAIL"
)

BREVO_SENDER_NAME = os.getenv(
    "BREVO_SENDER_NAME",
    "CloudVault"
)


# ============================================================
# AZURE CONNECTION
# ============================================================

blob_service_client = (
    BlobServiceClient.from_connection_string(
        AZURE_CONNECTION_STRING
    )
)

container_client = (
    blob_service_client.get_container_client(
        AZURE_CONTAINER_NAME
    )
)


# ============================================================
# DATABASE
# ============================================================

models.Base.metadata.create_all(
    bind=engine
)


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="CloudVault API",
    description="Secure Cloud File Storage using Microsoft Azure",
    version="4.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://swetha-hemanth.github.io"
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# SECURITY
# ============================================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "cloudvault-secret-key-2026"
)

ALGORITHM = "HS256"

TOKEN_EXPIRE_HOURS = 24

OTP_EXPIRE_MINUTES = 10


# ============================================================
# TEMPORARY OTP REGISTRATION STORE
# ============================================================

pending_registrations = {}


# ============================================================
# GENERAL HELPERS
# ============================================================

def current_time():

    return datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )


def add_activity(
    db: Session,
    user_id: int,
    action: str,
    file_name: str = None,
    details: str = None
):

    log = models.ActivityLog(
        user_id=user_id,
        action=action,
        file_name=file_name,
        details=details,
        created_at=current_time()
    )

    db.add(log)

    db.commit()


# ============================================================
# PASSWORD HELPERS
# ============================================================

def hash_password(
    password: str
):

    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(
    password: str,
    password_hash: str
):

    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8")
    )


# ============================================================
# JWT
# ============================================================

def create_access_token(
    user_id: int,
    email: str
):

    expiry = (
        datetime.utcnow()
        +
        timedelta(
            hours=TOKEN_EXPIRE_HOURS
        )
    )

    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expiry
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# ============================================================
# OTP
# ============================================================

def generate_otp():

    return str(
        random.randint(
            100000,
            999999
        )
    )


def validate_real_email(
    email: str
):

    try:

        result = validate_email(
            email,
            check_deliverability=True
        )

        return (
            result.normalized
            .strip()
            .lower()
        )

    except EmailNotValidError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


def save_pending_registration(
    name: str,
    email: str,
    password_hash: str,
    otp: str
):

    pending_registrations[email] = {

        "name":
            name,

        "email":
            email,

        "password_hash":
            password_hash,

        "otp":
            otp,

        "expires_at":
            datetime.utcnow()
            +
            timedelta(
                minutes=OTP_EXPIRE_MINUTES
            )
    }


def verify_registration_otp(
    email: str,
    otp: str
):

    registration = (
        pending_registrations.get(
            email
        )
    )

    if not registration:

        raise HTTPException(
            status_code=400,
            detail="No pending registration found"
        )

    if (
        datetime.utcnow()
        >
        registration["expires_at"]
    ):

        pending_registrations.pop(
            email,
            None
        )

        raise HTTPException(
            status_code=400,
            detail="OTP expired. Please request a new OTP."
        )

    if (
        registration["otp"]
        !=
        otp
    ):

        raise HTTPException(
            status_code=400,
            detail="Incorrect OTP"
        )

    return registration


# ============================================================
# SEND OTP EMAIL - BREVO HTTPS API
# ============================================================

def send_otp_email(
    email: str,
    otp: str
):

    if not BREVO_API_KEY:

        raise HTTPException(
            status_code=500,
            detail="BREVO_API_KEY is not configured"
        )

    if not BREVO_SENDER_EMAIL:

        raise HTTPException(
            status_code=500,
            detail="BREVO_SENDER_EMAIL is not configured"
        )

    url = (
        "https://api.brevo.com/v3/smtp/email"
    )

    headers = {

        "accept":
            "application/json",

        "api-key":
            BREVO_API_KEY,

        "content-type":
            "application/json"

    }

    payload = {

        "sender": {

            "name":
                BREVO_SENDER_NAME,

            "email":
                BREVO_SENDER_EMAIL

        },

        "to": [

            {

                "email":
                    email

            }

        ],

        "subject":
            "CloudVault Email Verification",

        "htmlContent":
            f"""
            <html>

            <body
                style="
                    margin:0;
                    padding:30px;
                    background:#f4f7fb;
                    font-family:Arial,sans-serif;
                "
            >

                <div
                    style="
                        max-width:520px;
                        margin:auto;
                        background:white;
                        border-radius:18px;
                        padding:35px;
                        box-shadow:0 10px 35px rgba(0,0,0,0.08);
                    "
                >

                    <h1
                        style="
                            color:#2563eb;
                            margin-top:0;
                        "
                    >
                        CloudVault
                    </h1>


                    <h2
                        style="
                            color:#111827;
                        "
                    >
                        Verify your email
                    </h2>


                    <p
                        style="
                            color:#64748b;
                            line-height:1.6;
                        "
                    >
                        Use the verification code below
                        to complete your CloudVault registration.
                    </p>


                    <div
                        style="
                            font-size:36px;
                            font-weight:bold;
                            letter-spacing:9px;
                            color:#111827;
                            text-align:center;
                            background:#eff6ff;
                            border-radius:14px;
                            padding:22px;
                            margin:28px 0;
                        "
                    >
                        {otp}
                    </div>


                    <p
                        style="
                            color:#64748b;
                        "
                    >
                        This code expires in
                        {OTP_EXPIRE_MINUTES} minutes.
                    </p>


                    <p
                        style="
                            color:#64748b;
                        "
                    >
                        Do not share this OTP with anyone.
                    </p>


                    <hr
                        style="
                            border:none;
                            border-top:1px solid #e2e8f0;
                            margin:28px 0;
                        "
                    >


                    <p
                        style="
                            color:#94a3b8;
                            font-size:13px;
                        "
                    >
                        CloudVault • Secure Cloud Storage
                    </p>

                </div>

            </body>

            </html>
            """
    }


    try:

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=20
        )


    except requests.RequestException as error:

        print(
            "BREVO CONNECTION ERROR:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to connect to email service"
        )


    if response.status_code not in (
        200,
        201,
        202
    ):

        print(
            "BREVO ERROR:",
            response.status_code,
            response.text
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to send OTP email"
        )


    print(
        f"OTP email sent successfully to {email}"
    )


# ============================================================
# AUTHENTICATED USER
# ============================================================

def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):

    if not authorization:

        raise HTTPException(
            status_code=401,
            detail="Login required"
        )


    if not authorization.startswith(
        "Bearer "
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header"
        )


    token = authorization.split(
        " ",
        1
    )[1]


    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get(
            "user_id"
        )


        if not user_id:

            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )


    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Token expired or invalid"
        )


    user = (

        db.query(
            models.User
        )

        .filter(
            models.User.id == user_id
        )

        .first()

    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )


    return user


# ============================================================
# FILE SERIALIZER
# ============================================================

def file_to_dict(
    record
):

    return {

        "id":
            record.id,

        "user_id":
            record.user_id,

        "name":
            record.name,

        "stored_name":
            record.stored_name,

        "size":
            record.size,

        "content_type":
            record.content_type,

        "starred":
            record.starred,

        "trashed":
            record.trashed,

        "locked":
            record.locked,

        "shared":
            record.shared,

        "shared_with":
            record.shared_with,

        "uploaded_at":
            record.uploaded_at,

        "modified_at":
            record.modified_at

    }


# ============================================================
# GET CURRENT USER FILE
# ============================================================

def get_user_file(
    file_id: int,
    user,
    db: Session
):

    record = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.id == file_id,
            models.FileRecord.user_id == user.id
        )

        .first()

    )


    if not record:

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )


    return record


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {

        "application":
            "CloudVault",

        "status":
            "running",

        "storage":
            "Microsoft Azure Blob Storage",

        "container":
            AZURE_CONTAINER_NAME,

        "authentication":
            "JWT + Email OTP",

        "email_service":
            "Brevo API",

        "message":
            "CloudVault Azure backend working successfully"

    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    try:

        container_client.get_container_properties()


        return {

            "backend":
                "healthy",

            "azure":
                "connected",

            "email_configured":
                bool(
                    BREVO_API_KEY
                    and
                    BREVO_SENDER_EMAIL
                )

        }


    except Exception as error:

        return {

            "backend":
                "healthy",

            "azure":
                "connection error",

            "email_configured":
                bool(
                    BREVO_API_KEY
                    and
                    BREVO_SENDER_EMAIL
                ),

            "detail":
                str(error)

        }


# ============================================================
# REGISTER - SEND OTP
# ============================================================

@app.post("/register")
def register_user(

    name: str = Form(...),

    email: str = Form(...),

    password: str = Form(...),

    db: Session = Depends(get_db)

):

    name = name.strip()


    if not name:

        raise HTTPException(
            status_code=400,
            detail="Name required"
        )


    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters"
        )


    email = validate_real_email(
        email.strip()
    )


    existing = (

        db.query(
            models.User
        )

        .filter(
            models.User.email == email
        )

        .first()

    )


    if existing:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    otp = generate_otp()


    password_hash = (
        hash_password(
            password
        )
    )


    save_pending_registration(
        name,
        email,
        password_hash,
        otp
    )


    send_otp_email(
        email,
        otp
    )


    print(
        f"OTP sent to {email}"
    )


    return {

        "message":
            "OTP sent successfully",

        "email":
            email,

        "verification_required":
            True

    }


# ============================================================
# VERIFY OTP
# ============================================================

@app.post("/verify-otp")
def verify_registration(

    email: str = Form(...),

    otp: str = Form(...),

    db: Session = Depends(get_db)

):

    email = (
        email
        .strip()
        .lower()
    )


    otp = (
        otp
        .strip()
    )


    registration = (
        verify_registration_otp(
            email,
            otp
        )
    )


    existing = (

        db.query(
            models.User
        )

        .filter(
            models.User.email == email
        )

        .first()

    )


    if existing:

        pending_registrations.pop(
            email,
            None
        )


        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    user = models.User(

        name=
            registration["name"],

        email=
            registration["email"],

        password_hash=
            registration["password_hash"]

    )


    db.add(user)

    db.commit()

    db.refresh(user)


    pending_registrations.pop(
        email,
        None
    )


    add_activity(
        db,
        user.id,
        "REGISTER",
        None,
        "Email verified and CloudVault account created"
    )


    return {

        "message":
            "Email verified successfully",

        "verified":
            True,

        "user": {

            "id":
                user.id,

            "name":
                user.name,

            "email":
                user.email

        }

    }


# ============================================================
# RESEND OTP
# ============================================================

@app.post("/resend-otp")
def resend_otp(
    email: str = Form(...)
):

    email = (
        email
        .strip()
        .lower()
    )


    registration = (
        pending_registrations.get(
            email
        )
    )


    if not registration:

        raise HTTPException(
            status_code=400,
            detail="No pending registration found"
        )


    new_otp = generate_otp()


    registration["otp"] = (
        new_otp
    )


    registration["expires_at"] = (
        datetime.utcnow()
        +
        timedelta(
            minutes=OTP_EXPIRE_MINUTES
        )
    )


    send_otp_email(
        email,
        new_otp
    )


    return {

        "message":
            "New OTP sent successfully"

    }


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
def login_user(

    email: str = Form(...),

    password: str = Form(...),

    db: Session = Depends(get_db)

):

    email = (
        email
        .strip()
        .lower()
    )


    user = (

        db.query(
            models.User
        )

        .filter(
            models.User.email == email
        )

        .first()

    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    if not verify_password(
        password,
        user.password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    token = create_access_token(
        user.id,
        user.email
    )


    add_activity(
        db,
        user.id,
        "LOGIN",
        None,
        "User logged in"
    )


    return {

        "message":
            "Login successful",

        "access_token":
            token,

        "token_type":
            "bearer",

        "user": {

            "id":
                user.id,

            "name":
                user.name,

            "email":
                user.email

        }

    }


# ============================================================
# UPLOAD FILE TO AZURE
# ============================================================

@app.post("/upload")
async def upload_file(

    file: UploadFile = File(...),

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="Invalid file"
        )


    extension = os.path.splitext(
        file.filename
    )[1]


    blob_name = (
        f"user_{user.id}/"
        +
        str(uuid.uuid4())
        +
        extension
    )


    try:

        file_data = await file.read()


        blob_client = (
            container_client.get_blob_client(
                blob_name
            )
        )


        blob_client.upload_blob(

            file_data,

            overwrite=False,

            content_settings=ContentSettings(

                content_type=(
                    file.content_type
                    or
                    "application/octet-stream"
                )

            )

        )


    except Exception as error:

        print(
            "AZURE UPLOAD ERROR:",
            error
        )


        raise HTTPException(
            status_code=500,
            detail="Azure file upload failed"
        )


    finally:

        await file.close()


    now = current_time()


    record = models.FileRecord(

        user_id=user.id,

        name=file.filename,

        stored_name=blob_name,

        size=len(file_data),

        content_type=(
            file.content_type
            or
            "application/octet-stream"
        ),

        starred=False,

        trashed=False,

        locked=False,

        shared=False,

        shared_with="[]",

        uploaded_at=now,

        modified_at=now

    )


    db.add(record)
        db.commit()

    db.refresh(record)


    add_activity(
        db,
        user.id,
        "UPLOAD",
        record.name,
        "File uploaded to Azure Blob Storage"
    )


    return {

        "message":
            "File uploaded to Azure successfully",

        "storage":
            "Azure Blob Storage",

        "file":
            file_to_dict(record)

    }


# ============================================================
# MY FILES
# ============================================================

@app.get("/files")
def get_files(

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    records = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.user_id == user.id,
            models.FileRecord.trashed == False,
            models.FileRecord.locked == False
        )

        .order_by(
            models.FileRecord.id.desc()
        )

        .all()

    )


    return [

        file_to_dict(record)

        for record in records

    ]


# ============================================================
# STARRED
# ============================================================

@app.get("/starred")
def starred_files(

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    records = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.user_id == user.id,
            models.FileRecord.starred == True,
            models.FileRecord.trashed == False,
            models.FileRecord.locked == False
        )

        .all()

    )


    return [

        file_to_dict(record)

        for record in records

    ]


# ============================================================
# SHARED
# ============================================================

@app.get("/shared")
def shared_files(

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    records = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.user_id == user.id,
            models.FileRecord.shared == True,
            models.FileRecord.trashed == False
        )

        .all()

    )


    return [

        file_to_dict(record)

        for record in records

    ]


# ============================================================
# LOCKED
# ============================================================

@app.get("/locked")
def locked_files(

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    records = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.user_id == user.id,
            models.FileRecord.locked == True,
            models.FileRecord.trashed == False
        )

        .all()

    )


    return [

        file_to_dict(record)

        for record in records

    ]


# ============================================================
# TRASH
# ============================================================

@app.get("/trash")
def trash_files(

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    records = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.user_id == user.id,
            models.FileRecord.trashed == True
        )

        .all()

    )


    return [

        file_to_dict(record)

        for record in records

    ]


# ============================================================
# DOWNLOAD
# ============================================================

@app.get("/download/{file_id}")
def download_file(

    file_id: int,

    db: Session = Depends(get_db)

):

    record = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.id == file_id
        )

        .first()

    )


    if not record:

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )


    try:

        blob_client = (
            container_client.get_blob_client(
                record.stored_name
            )
        )


        stream = (
            blob_client.download_blob()
        )


        return StreamingResponse(

            stream.chunks(),

            media_type=
                record.content_type,

            headers={

                "Content-Disposition":
                    f'attachment; filename="{record.name}"'

            }

        )


    except Exception as error:

        print(
            "DOWNLOAD ERROR:",
            error
        )


        raise HTTPException(
            status_code=404,
            detail="Azure file not found"
        )


# ============================================================
# PREVIEW
# ============================================================

@app.get("/preview/{file_id}")
def preview_file(

    file_id: int,

    db: Session = Depends(get_db)

):

    record = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.id == file_id
        )

        .first()

    )


    if not record:

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )


    try:

        blob_client = (
            container_client.get_blob_client(
                record.stored_name
            )
        )


        stream = (
            blob_client.download_blob()
        )


        return StreamingResponse(
            stream.chunks(),
            media_type=
                record.content_type
        )


    except Exception as error:

        print(
            "PREVIEW ERROR:",
            error
        )


        raise HTTPException(
            status_code=404,
            detail="Azure file not found"
        )


# ============================================================
# RENAME FILE
# ============================================================

@app.put("/rename/{file_id}")
def rename_file(

    file_id: int,

    new_name: str,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    record = get_user_file(
        file_id,
        user,
        db
    )


    if not new_name.strip():

        raise HTTPException(
            status_code=400,
            detail="File name cannot be empty"
        )


    old_name = (
        record.name
    )


    record.name = (
        new_name.strip()
    )


    record.modified_at = (
        current_time()
    )


    db.commit()

    db.refresh(record)


    add_activity(
        db,
        user.id,
        "RENAME",
        record.name,
        f"File renamed from {old_name} to {record.name}"
    )


    return {

        "message":
            "File renamed successfully",

        "file":
            file_to_dict(record)

    }


# ============================================================
# STAR / UNSTAR
# ============================================================

@app.put("/star/{file_id}")
def star_file(

    file_id: int,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    record = get_user_file(
        file_id,
        user,
        db
    )


    record.starred = (
        not record.starred
    )


    record.modified_at = (
        current_time()
    )


    db.commit()


    add_activity(

        db,

        user.id,

        (
            "STAR"
            if record.starred
            else
            "UNSTAR"
        ),

        record.name,

        (
            "File added to Starred"
            if record.starred
            else
            "File removed from Starred"
        )

    )


    return {

        "message":
            "Star updated",

        "starred":
            record.starred

    }


# ============================================================
# LOCK
# ============================================================

@app.put("/lock/{file_id}")
def lock_file(

    file_id: int,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    record = get_user_file(
        file_id,
        user,
        db
    )


    record.locked = True


    record.modified_at = (
        current_time()
    )


    db.commit()


    add_activity(
        db,
        user.id,
        "LOCK",
        record.name,
        "File moved to Private Vault"
    )


    return {

        "message":
            "File moved to Locked Folder"

    }


# ============================================================
# UNLOCK
# ============================================================

@app.put("/unlock-file/{file_id}")
def unlock_file(

    file_id: int,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    record = get_user_file(
        file_id,
        user,
        db
    )


    record.locked = False


    record.modified_at = (
        current_time()
    )


    db.commit()


    add_activity(
        db,
        user.id,
        "UNLOCK",
        record.name,
        "File moved back to My Drive"
    )


    return {

        "message":
            "File moved to My Drive"

    }


# ============================================================
# MOVE TO TRASH
# ============================================================

@app.put("/trash/{file_id}")
def move_to_trash(

    file_id: int,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    record = get_user_file(
        file_id,
        user,
        db
    )


    record.trashed = True


    record.modified_at = (
        current_time()
    )


    db.commit()


    add_activity(
        db,
        user.id,
        "TRASH",
        record.name,
        "File moved to Trash"
    )


    return {

        "message":
            "File moved to Trash"

    }


# ============================================================
# RESTORE
# ============================================================

@app.put("/restore/{file_id}")
def restore_file(

    file_id: int,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    record = get_user_file(
        file_id,
        user,
        db
    )


    record.trashed = False


    record.modified_at = (
        current_time()
    )


    db.commit()


    add_activity(
        db,
        user.id,
        "RESTORE",
        record.name,
        "File restored from Trash"
    )


    return {

        "message":
            "File restored"

    }


# ============================================================
# PERMANENT DELETE
# ============================================================

@app.delete("/files/{file_id}")
def delete_file(

    file_id: int,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    record = get_user_file(
        file_id,
        user,
        db
    )


    deleted_file_name = (
        record.name
    )


    try:

        blob_client = (
            container_client.get_blob_client(
                record.stored_name
            )
        )


        blob_client.delete_blob()


    except Exception as error:

        print(
            "AZURE DELETE WARNING:",
            error
        )


    db.delete(record)

    db.commit()


    add_activity(
        db,
        user.id,
        "DELETE",
        deleted_file_name,
        "File permanently deleted from Azure"
    )


    return {

        "message":
            "File permanently deleted from Azure"

    }


# ============================================================
# SHARE
# ============================================================

@app.post("/share/{file_id}")
def share_file(

    file_id: int,

    email: str = Form(...),

    permission: str = Form(
        "Viewer"
    ),

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    record = get_user_file(
        file_id,
        user,
        db
    )


    email = (
        email
        .strip()
        .lower()
    )


    if (
        not email
        or
        "@" not in email
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid email"
        )


    try:

        people = json.loads(
            record.shared_with
            or
            "[]"
        )


    except json.JSONDecodeError:

        people = []


    found = False


    for person in people:

        if (
            person.get("email")
            ==
            email
        ):

            person["permission"] = (
                permission
            )

            found = True


    if not found:

        people.append(
            {

                "email":
                    email,

                "permission":
                    permission

            }
        )


    record.shared = True


    record.shared_with = (
        json.dumps(people)
    )


    record.modified_at = (
        current_time()
    )


    db.commit()


    add_activity(
        db,
        user.id,
        "SHARE",
        record.name,
        f"File shared with {email} as {permission}"
    )


    return {

        "message":
            "File shared successfully",

        "shared_with":
            people

    }


# ============================================================
# CREATE FOLDER
# ============================================================

@app.post("/folders")
def create_folder(

    name: str = Form(...),

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    name = name.strip()


    if not name:

        raise HTTPException(
            status_code=400,
            detail="Folder name required"
        )


    folder = models.FolderRecord(

        user_id=user.id,

        name=name,

        locked=False,

        trashed=False,

        created_at=current_time()

    )


    db.add(folder)

    db.commit()

    db.refresh(folder)


    add_activity(
        db,
        user.id,
        "CREATE_FOLDER",
        folder.name,
        "New folder created"
    )


    return {

        "message":
            "Folder created",

        "folder": {

            "id":
                folder.id,

            "name":
                folder.name,

            "user_id":
                folder.user_id,

            "created_at":
                folder.created_at

        }

    }


# ============================================================
# GET FOLDERS
# ============================================================

@app.get("/folders")
def get_folders(

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    folders = (

        db.query(
            models.FolderRecord
        )

        .filter(
            models.FolderRecord.user_id == user.id,
            models.FolderRecord.trashed == False
        )

        .all()

    )


    return [

        {

            "id":
                folder.id,

            "name":
                folder.name,

            "user_id":
                folder.user_id,

            "locked":
                folder.locked,

            "created_at":
                folder.created_at

        }

        for folder in folders

    ]


# ============================================================
# RENAME FOLDER
# ============================================================

@app.put("/folders/{folder_id}")
def rename_folder(

    folder_id: int,

    new_name: str,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    folder = (

        db.query(
            models.FolderRecord
        )

        .filter(
            models.FolderRecord.id == folder_id,
            models.FolderRecord.user_id == user.id
        )

        .first()

    )


    if not folder:

        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )


    if not new_name.strip():

        raise HTTPException(
            status_code=400,
            detail="Folder name cannot be empty"
        )


    old_folder_name = (
        folder.name
    )


    folder.name = (
        new_name.strip()
    )


    db.commit()


    add_activity(
        db,
        user.id,
        "RENAME_FOLDER",
        folder.name,
        f"Folder renamed from {old_folder_name} to {folder.name}"
    )


    return {

        "message":
            "Folder renamed"

    }


# ============================================================
# DELETE FOLDER
# ============================================================

@app.delete("/folders/{folder_id}")
def delete_folder(

    folder_id: int,

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    folder = (

        db.query(
            models.FolderRecord
        )

        .filter(
            models.FolderRecord.id == folder_id,
            models.FolderRecord.user_id == user.id
        )

        .first()

    )


    if not folder:

        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )


    deleted_folder_name = (
        folder.name
    )


    db.delete(folder)

    db.commit()


    add_activity(
        db,
        user.id,
        "DELETE_FOLDER",
        deleted_folder_name,
        "Folder deleted"
    )


    return {

        "message":
            "Folder deleted"

    }


# ============================================================
# STORAGE
# ============================================================

@app.get("/storage")
def storage(

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    records = (

        db.query(
            models.FileRecord
        )

        .filter(
            models.FileRecord.user_id == user.id
        )

        .all()

    )


    total_bytes = sum(

        record.size or 0

        for record in records

    )


    used_mb = (
        total_bytes /
        1024 /
        1024
    )


    used_gb = (
        total_bytes /
        1024 /
        1024 /
        1024
    )


    limit_gb = 15


    percentage = (
        used_gb /
        limit_gb *
        100
    )


    return {

        "file_count":
            len(records),

        "used_bytes":
            total_bytes,

        "used_mb":
            round(
                used_mb,
                2
            ),

        "used_gb":
            round(
                used_gb,
                3
            ),

        "limit_gb":
            limit_gb,

        "usage_percent":
            round(
                percentage,
                2
            ),

        "storage_provider":
            "Microsoft Azure Blob Storage"

    }


# ============================================================
# ACTIVITY
# ============================================================

@app.get("/activity")
def get_activity(

    user=Depends(get_current_user),

    db: Session = Depends(get_db)

):

    logs = (

        db.query(
            models.ActivityLog
        )

        .filter(
            models.ActivityLog.user_id
            ==
            user.id
        )

        .order_by(
            models.ActivityLog.id.desc()
        )

        .limit(50)

        .all()

    )


    return [

        {

            "id":
                log.id,

            "action":
                log.action,

            "file_name":
                log.file_name,

            "details":
                log.details,

            "created_at":
                log.created_at

        }

        for log in logs

    ]