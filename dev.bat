@echo off
title To-Do List Dev Runner
echo ==========================================
echo   Khoi dong du an To-Do List (Fullstack)
echo ==========================================

echo [1/2] Dang chay Backend tai cong 5001...
start "Backend Server" cmd /k "cd to-do-list\backend && npm run dev"

echo [2/2] Dang chay Frontend tai cong 5173...
start "Frontend Server" cmd /k "cd to-do-list\frontend && npm run dev"

echo.
echo ------------------------------------------
echo Tat ca da san sang! 
echo Backend: http://localhost:5001
echo Frontend: http://localhost:5173
echo ------------------------------------------
pause
