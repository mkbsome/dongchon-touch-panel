@echo off
chcp 65001 > nul
title Backend Server (8000)

cd /d "%~dp0backend"

if not exist "venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt -q

echo.
echo === Backend Server Starting ===
echo http://localhost:8000
echo http://localhost:8000/docs (API Documentation)
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
