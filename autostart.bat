@echo off
chcp 65001 > nul
title Dongchon Pickling System

cd /d "C:\dongchon-touch-panel-main"

echo [1/2] Starting Backend...
start /B "" cmd /c "cd /d C:\dongchon-touch-panel-main\backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"

echo [2/2] Starting Frontend...
timeout /t 3 /nobreak > nul
start /B "" cmd /c "cd /d C:\dongchon-touch-panel-main && npm run dev"

timeout /t 8 /nobreak > nul
start http://localhost:3000

echo.
echo ========================================
echo   Dongchon Pickling System Started
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8001
echo ========================================
echo.
echo Press any key to stop servers...
pause > nul

taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
echo Servers stopped.
