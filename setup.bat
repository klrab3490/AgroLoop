@echo off
REM ==============================================================================
REM AgroLoop - Windows Environment Setup & Package Verification Script
REM ==============================================================================

setlocal enabledelayedexpansion

echo ======================================================
echo   AgroLoop Windows Environment Setup & Checker
echo ======================================================

REM 1. Check Git
where git >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=3" %%g in ('git --version') do set GIT_VER=%%g
    echo [OK] Git is installed: version !GIT_VER!
) else (
    echo [WARN] Git is not installed or not in PATH.
    echo Attempting to install Git via winget...
    winget install --id Git.Git -e --source winget
)

REM 2. Check Java
set JAVA_SATISFIED=0
where java >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Java detected in PATH.
    set JAVA_SATISFIED=1
) else if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\java.exe" (
        echo [OK] Java detected at %JAVA_HOME%
        set JAVA_SATISFIED=1
    )
)

if %JAVA_SATISFIED% equ 0 (
    echo [WARN] Java JDK 21+ not found!
    echo Attempting to install Eclipse Temurin JDK 21 via winget...
    winget install --id EclipseAdoptium.Temurin.21.JDK -e --source winget
    echo Please restart your terminal after installation to reload PATH.
)

REM 3. Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Docker detected.
) else (
    echo [WARN] Docker Desktop not found in PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
)

REM 4. Check .env configuration
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example...
        copy .env.example .env >nul
        echo [OK] .env configuration created.
    )
) else (
    echo [OK] .env configuration file exists.
)

echo.
echo ======================================================
echo   Setup Check Complete
echo ======================================================
echo Next steps:
echo   1. Start PostgreSQL:  docker compose up -d postgres
echo   2. Run AgroLoop:      run.bat
echo   3. Open browser at:   http://localhost:8080
echo.
