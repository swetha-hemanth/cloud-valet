# CloudVault - Secure Cloud Storage System

CloudVault is a secure cloud-based file storage and sharing system developed using FastAPI, JavaScript, SQLite, and Microsoft Azure Blob Storage.

## Project Objective

The objective of CloudVault is to provide users with a secure platform to upload, store, manage, organize, and share files using cloud storage.

## Features

- User Registration and Login
- Email OTP Verification
- JWT Authentication
- Secure File Upload
- Microsoft Azure Blob Storage Integration
- File Download and Preview
- Rename Files
- Star Important Files
- Move Files to Trash
- Restore Files
- Permanent File Deletion
- Private Vault / Locked Folder
- Folder Creation and Management
- File Sharing
- Activity Logs
- Storage Usage Monitoring
- User-Specific File Storage
- Professional Dashboard Interface

## Technologies Used

### Frontend

- HTML
- CSS
- JavaScript
- Font Awesome

### Backend

- Python
- FastAPI
- SQLAlchemy
- JWT Authentication
- bcrypt
- Email OTP Verification

### Database

- SQLite

SQLite is used to store structured application data such as:

- User information
- File metadata
- Folder information
- Activity logs

### Cloud Storage

Microsoft Azure Blob Storage is used to store the actual uploaded files securely in the cloud.

## System Architecture

```text
User
  |
  v
Frontend
HTML + CSS + JavaScript
  |
  v
FastAPI Backend
  |
  |---- JWT Authentication
  |
  |---- Email OTP Verification
  |
  |---- SQLite Database
  |       |
  |       |---- Users
  |       |---- File Metadata
  |       |---- Folders
  |       |---- Activity Logs
  |
  v
Microsoft Azure Blob Storage
  |
  v
Cloud Files