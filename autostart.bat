@echo off
chcp 65001 > nul
title Dongchon Pickling System

cd /d "%~dp0"

echo [1/2] Starting Backend...
cd backend
start /B "" cmd /c "venv\Scripts\activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [2/2] Starting Frontend...
cd ..
timeout /t 3 /nobreak > nul
start /B "" cmd /c "npm run dev"

echo.
echo ========================================
echo   Dongchon Pickling System Started
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo ========================================
echo.
echo Press any key to stop servers...
pause > nul

taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
echo Servers stopped.
