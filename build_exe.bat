@echo off
chcp 65001 > nul
title Build Dongchon Touch Panel Installer
cd /d "%~dp0"

echo ============================================
echo   동촌에프에스 절임 입력기 - 설치파일 빌드
echo ============================================
echo.

:: Check for Python
python --version > nul 2>&1
if errorlevel 1 (
    echo [오류] Python이 설치되지 않았습니다!
    echo python.org에서 Python 3.10+ 설치 필요
    pause
    exit /b 1
)

:: Check for Node.js
node --version > nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되지 않았습니다!
    echo nodejs.org에서 Node.js LTS 설치 필요
    pause
    exit /b 1
)

echo [1/7] Backend 가상환경 설정 중...
cd backend
if not exist "venv" (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/7] Backend 패키지 설치 중...
pip install -r requirements.txt -q
pip install pyinstaller -q

echo [3/7] Backend EXE 빌드 중...
pyinstaller backend.spec --distpath ../backend-dist --workpath ./build --clean -y
if errorlevel 1 (
    echo [오류] Backend 빌드 실패!
    pause
    exit /b 1
)
cd ..

echo [4/7] Frontend 패키지 설치 중...
call npm install

echo [5/7] Frontend 빌드 중 (Next.js static export)...
call npm run build
if errorlevel 1 (
    echo [오류] Frontend 빌드 실패!
    pause
    exit /b 1
)

echo [6/7] 아이콘 생성 중...
cd backend
call venv\Scripts\activate.bat
pip install pillow cairosvg -q
python ../scripts/create_ico.py
cd ..

echo [7/7] Electron 설치파일 빌드 중...
cd electron
call npm install
call npm run build
if errorlevel 1 (
    echo [오류] Electron 빌드 실패!
    pause
    exit /b 1
)
cd ..

echo.
echo ============================================
echo   빌드 완료!
echo.
echo   설치파일 위치: dist\
echo   파일명: "동촌 절임 입력기 Setup 1.0.0.exe"
echo ============================================
echo.
pause
