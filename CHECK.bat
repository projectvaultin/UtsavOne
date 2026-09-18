@echo off
title Festival OS - Check
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  pause
  exit /b 1
)
call npm run check
if errorlevel 1 (
  echo CHECK FAILED.
  pause
  exit /b 1
)
echo.
echo Festival OS code check PASSED.
pause
