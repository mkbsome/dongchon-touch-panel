@echo off
title Auto Start Setup

set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\TouchPanel.lnk
set TARGET_PATH=C:\touch-panel-system\start.bat

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_PATH%'; $s.WorkingDirectory = 'C:touch-panel-system'; $s.Save()"

echo.
echo Auto start registered!
echo System will start automatically when computer boots.
echo.
pause
