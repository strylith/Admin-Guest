@echo off
echo ================================================
echo Kina Resort System - Starting Server
echo ================================================
echo.
echo Checking for .env file...
if not exist .env (
    echo [WARNING] .env file not found!
    echo Please copy env.example.txt to .env and configure it.
    echo.
    pause
    exit /b 1
)
echo .env file found!
echo.
echo Installing dependencies...
call npm install
echo.
echo Starting server...
echo.
echo Server will start at: http://localhost:3000
echo.
echo ================================================
call npm start
pause

