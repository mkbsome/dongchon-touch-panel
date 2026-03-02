@echo off
title Stop Touch Panel

echo Stopping servers...

taskkill /f /im node.exe 2>nul
taskkill /f /im python.exe 2>nul

echo.
echo Servers stopped.
timeout /t 2 > nul
exit
