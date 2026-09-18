@echo off
title Festival OS
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)
echo Checking Festival OS...
call npm run check
if errorlevel 1 (
  echo.
  echo CHECK FAILED. The project was not started.
  pause
  exit /b 1
)
echo.
echo Starting Festival OS...
set NO_BROWSER=0
npm start
pause
