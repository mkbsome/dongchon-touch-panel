@echo off
chcp 65001 > nul
title Dongchon Pickling System

echo ============================================
echo   Dongchon Pickling Condition Input System
echo ============================================
echo.

:: Start Backend
echo Starting Backend Server...
cd /d "%~dp0backend"
if not exist "venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    python -m venv venv
)

start "Backend" cmd /k "chcp 65001 > nul && call venv\Scripts\activate.bat && pip install -r requirements.txt -q && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

:: Start Frontend
echo Starting Frontend Server...
cd /d "%~dp0"
start "Frontend" cmd /k "chcp 65001 > nul && npm run dev"

:: Wait and open browser
timeout /t 5 /nobreak > nul
start "" "http://localhost:3000"

echo.
echo ============================================
echo   Servers Started!
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ============================================
echo.
echo Press any key to close this window...
echo (Servers will continue running)
pause > nul
