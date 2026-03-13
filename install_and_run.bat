@echo off
chcp 65001 > nul
title 동촌에프에스 절임 입력기 - 설치 및 실행
cd /d "%~dp0"

echo ============================================
echo   동촌에프에스 절임 조건 입력기
echo   설치 및 실행
echo ============================================
echo.

:: Python 확인
python --version > nul 2>&1
if errorlevel 1 (
    echo [오류] Python이 설치되지 않았습니다!
    echo python.org에서 Python 3.10+ 설치 필요
    pause
    exit /b 1
)

:: Node.js 확인
node --version > nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되지 않았습니다!
    echo nodejs.org에서 Node.js LTS 설치 필요
    pause
    exit /b 1
)

echo [1/4] Backend 설정 중...
cd backend
if not exist "venv" (
    echo   - 가상환경 생성 중...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo   - 패키지 설치 중...
pip install -r requirements.txt -q
cd ..

echo.
echo [2/4] Frontend 설정 중...
if not exist "node_modules" (
    echo   - 패키지 설치 중... (시간이 걸릴 수 있습니다)
    call npm install
)

echo.
echo [3/4] 바탕화면 바로가기 생성 중...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\동촌 절임 입력기.lnk'); $s.TargetPath = '%~dp0start_all.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0assets\icon.ico'; $s.Save()"

echo.
echo [4/4] 서버 시작 중...
echo.
echo ============================================
echo   설치 완료!
echo.
echo   바탕화면에 "동촌 절임 입력기" 바로가기 생성됨
echo   다음부터는 바로가기로 실행하세요
echo ============================================
echo.

:: 서버 시작
call start_all.bat
