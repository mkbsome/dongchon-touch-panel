@echo off
title Touch Panel System

echo ========================================
echo    Starting Touch Panel System...
echo ========================================
echo.

echo [1/3] Starting backend...
start "Backend" cmd /k "cd /d C:\touch-panel-system\backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

echo [2/3] Starting frontend...
start "Frontend" cmd /k "cd /d C:\touch-panel-system && npm run dev"

echo [3/3] Waiting for servers...
timeout /t 5 /nobreak > nul

echo Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo    System started!
echo    You can close this window.
echo ========================================
timeout /t 3 > nul
exit
