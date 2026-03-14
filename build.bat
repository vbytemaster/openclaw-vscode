@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo [1/3] npm ci
call npm ci
if errorlevel 1 goto :fail

echo [2/3] compile
call npm run compile
if errorlevel 1 goto :fail

echo [3/3] package VSIX
call npm run package
if errorlevel 1 goto :fail

echo Done. VSIX file is in: %cd%
exit /b 0

:fail
echo Build failed with code %errorlevel%
exit /b %errorlevel%
