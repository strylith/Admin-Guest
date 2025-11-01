@echo off
echo ====================================
echo   KINA DASHBOARD - STARTING SERVER
echo ====================================
echo.

cd /d "%~dp0"

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies are already installed.
)

echo.
echo [2/3] Starting Dashboard server...
echo.
echo Dashboard will be available at: http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

call npm start

pause
