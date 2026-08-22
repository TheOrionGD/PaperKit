@echo off
title PaperKit Local Launcher
echo ===================================================
echo             Starting PaperKit Services            
echo ===================================================
echo.

:: Start the FastAPI backend service
echo [1/2] Launching Backend (FastAPI on Port 8000)...
start "PaperKit Backend" cmd /k "cd Services && .venv\Scripts\python -m uvicorn main:app --reload --port 8000"

:: Start the React frontend service
echo [2/2] Launching Frontend (Vite Dev Server)...
start "PaperKit Frontend" cmd /k "cd paper-kit && npm run dev"

echo.
echo ===================================================
echo Both Backend and Frontend dev servers are running.
echo Please check the newly opened command windows for logs.
echo ===================================================
echo.
pause
