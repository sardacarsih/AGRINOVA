@echo off
REM Debug deployment script untuk troubleshooting production issues

echo 🔍 Starting Agrinova Web Debug Deployment...

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    exit /b 1
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm not found  
    exit /b 1
)

echo ✅ Environment check passed

REM Show current configuration
echo.
echo 🔧 Current Configuration:
echo NODE_ENV: %NODE_ENV%
if exist .env.local (
    echo 📁 .env.local found
    findstr "NEXT_PUBLIC_API_URL" .env.local 2>nul
) else (
    echo ❌ .env.local not found
)

if exist .env.production (
    echo 📁 .env.production found
    findstr "NEXT_PUBLIC_API_URL" .env.production 2>nul
) else (
    echo ❌ .env.production not found
)

echo.
echo 📦 Installing dependencies...
call npm ci
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    exit /b 1
)

echo.
echo 🔨 Building application with debug info...
set NEXT_PUBLIC_DEBUG=true
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed
    exit /b 1
)

echo.
echo 🚀 Starting application...
echo 📋 Debug info will be available at:
echo    - Console logs for API configuration
echo    - Debug component in bottom-right corner
echo    - Network tab in browser dev tools

echo.
echo 🌐 Application will be available at:
echo    - Local: http://localhost:3000
echo    - Production: https://agrinova.kskgroup.web.id

echo.
call npm run start

pause
