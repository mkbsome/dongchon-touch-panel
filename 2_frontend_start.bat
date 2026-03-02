@echo off
chcp 65001 > nul
title Frontend Server (3000)

cd /d "%~dp0"

if not exist "node_modules\next" (
    echo Installing npm packages...
    call npm install
)

echo.
echo === Frontend Server Starting ===
echo http://localhost:3000
echo.

npm run dev
pause
