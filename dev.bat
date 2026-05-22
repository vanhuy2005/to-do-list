@echo off
title To-Do List Dev Runner
echo ==========================================
echo   Khoi dong du an To-Do List (Fullstack)
echo ==========================================

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%to-do-list\backend"
set "FRONTEND_DIR=%ROOT_DIR%to-do-list\frontend"

echo [0/3] Dang dong cac cong bi chiem...
for %%P in (5001 5173) do call :FreePort %%P

echo [1/3] Dang chay Backend tai cong 5001...
start "" /B /D "%BACKEND_DIR%" npm run dev

echo [2/3] Dang chay Frontend tai cong 5173...
start "" /B /D "%FRONTEND_DIR%" npm run dev

echo.
echo ------------------------------------------
echo Tat ca da san sang!
echo Backend: http://localhost:5001
echo Frontend: http://localhost:5173
echo ------------------------------------------
pause
exit /b 0

:FreePort
setlocal enabledelayedexpansion
set "PORT=%~1"
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort !PORT! -State Listen ^| Select-Object -ExpandProperty OwningProcess -Unique"`) do (
	echo   - Dang tat PID %%P tren cong !PORT!
	taskkill /F /PID %%P >nul 2>nul
)
endlocal
exit /b 0
