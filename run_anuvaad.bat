@echo off
title Anuvaad Launcher
echo =================================================================
echo           🚀 LAUNCHING ANUVAAD CODE TRANSLATOR 🚀
echo =================================================================
echo.

:: 0. Pre-flight checks
if not exist ".env" (
    echo [WARNING] No .env file found in the root directory!
    echo Backend might fail if API keys or Supabase credentials are missing.
    echo.
)

:: 1. Start Backend in a separate window
echo [1/3] Starting Backend Server (Python FastAPI)...
:: Check for common virtual environment folders and activate if found
set VENV_CMD=
if exist "venv\Scripts\activate.bat" (
    set VENV_CMD=call venv\Scripts\activate.bat ^& 
) else if exist "env\Scripts\activate.bat" (
    set VENV_CMD=call env\Scripts\activate.bat ^& 
)

start "Anuvaad Backend (FastAPI)" cmd /k "%VENV_CMD%echo Starting Backend Server with Hot-Reload on port 8000... & python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

:: 2. Start Celery Worker in a separate window
echo [2/4] Starting Celery Worker (Background Tasks)...
start "Anuvaad Celery Worker" cmd /k "%VENV_CMD%echo Starting Celery Worker... & celery -A app.queue.celery_config.celery_app worker --loglevel=info -P solo"

:: 3. Start Frontend in a separate window
echo [3/4] Starting Frontend Server (Next.js Production Build)...
start "Anuvaad Frontend (Next.js)" cmd /k "echo Starting Frontend Production Server on port 3000... & cd frontend & npm start"

:: 4. Wait a few seconds for servers to stand up, then open browser
echo [4/4] Waiting for servers to warm up (5 seconds)...
timeout /t 5 /nobreak > nul

echo.
echo 🌐 Opening Anuvaad in your web browser...
start http://localhost:3000

echo.
echo =================================================================
echo 🎉 SUCCESS! Anuvaad is now running.
echo.
echo IMPORTANT: Please keep the two command prompt windows open. 
echo If you close them, the website will stop working!
echo.
echo Press any key to close this launcher...
echo =================================================================
pause > nul
