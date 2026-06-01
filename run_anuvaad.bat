@echo off
title Anuvaad Launcher
echo =================================================================
echo           🚀 LAUNCHING ANUVAAD CODE TRANSLATOR 🚀
echo =================================================================
echo.

:: 1. Start Backend in a separate window
echo [1/3] Starting Backend Server (Python FastAPI)...
start "Anuvaad Backend (FastAPI)" cmd /k "echo Starting Backend Server on port 8000... & python -m uvicorn main:app --host 127.0.0.1 --port 8000"

:: 2. Start Frontend in a separate window
echo [2/3] Starting Frontend Server (Next.js)...
start "Anuvaad Frontend (Next.js)" cmd /k "echo Starting Frontend Dev Server on port 3000... & cd frontend & npm run dev"

:: 3. Wait a few seconds for servers to stand up, then open browser
echo [3/3] Waiting for servers to warm up (5 seconds)...
timeout /t 5 /nobreak > nul

echo.
echo 🌐 Opening Anuvaad in your web browser...
start http://localhost:3000

echo.
echo =================================================================
echo 🎉 SUCCESS! Anuvaad is now running.
echo.
echo IMPORTANT: Please keep the other two command prompt windows open. 
echo If you close them, the website will stop working!
echo.
echo Press any key to close this launcher...
echo =================================================================
pause > nul
