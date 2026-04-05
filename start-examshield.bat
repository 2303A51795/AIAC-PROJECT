@echo off
setlocal EnableDelayedExpansion
title AIAC PROJECT - ExamShield AI - All Services
color 0B

:: Store script location
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: KILL ANY EXISTING PROCESSES
echo.
echo  [CLEANUP] Stopping any existing services...
taskkill /F /FI "WINDOWTITLE eq AIAC - Backend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq AIAC - AI*" 2>nul
taskkill /F /FI "WINDOWTITLE eq AIAC - Frontend*" 2>nul

:: FIND JAVA
echo.
echo  [JAVA] Locating Java installation...

if exist "C:\Program Files\Eclipse Adoptium\jdk-21.0.4.7-hotspot\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.4.7-hotspot"
    goto :java_found
)

if exist "C:\Program Files\Java\jdk-26\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-26"
    goto :java_found
)

if exist "C:\Program Files\Java\jdk-17\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-17"
    goto :java_found
)

echo  [ERROR] Java not found! Please install Java 17 or higher.
pause
exit /b 1

:java_found
echo        Found: %JAVA_HOME%
set "PATH=%JAVA_HOME%\bin;%PATH%"

:: START SERVICES
echo.
echo  ============================================
echo    AIAC PROJECT - Starting All Services
echo  ============================================
echo.

:: 1. Backend (Spring Boot)
echo  [1/3] Starting Spring Boot Backend (Port 8080)...
start "AIAC - Backend (8080)" cmd /k "cd /d %SCRIPT_DIR%backend && %SCRIPT_DIR%backend\mvnw.cmd spring-boot:run -DskipTests"
echo        Window: "AIAC - Backend (8080)"
echo.

:: Wait for backend to initialize
ping 127.0.0.1 -n 5 >nul

:: 2. AI Server (Python + venv)
echo  [2/3] Starting Python AI Server (Port 5000)...
cd /d "%SCRIPT_DIR%ai_backend"
if not exist "venv\Scripts\activate.bat" (
    echo        Creating Python virtual environment...
    python -m venv venv
)
start "AIAC - AI Server (5000)" cmd /k "cd /d %SCRIPT_DIR%ai_backend && venv\Scripts\activate.bat && python src\detector.py"
cd /d "%SCRIPT_DIR%"
echo        Window: "AIAC - AI Server (5000)"
echo.

:: Wait for AI server
ping 127.0.0.1 -n 4 >nul

:: 3. Frontend (Vite)
echo  [3/3] Starting Vite Frontend (Port 5173)...
start "AIAC - Frontend (5173)" cmd /k "cd /d %SCRIPT_DIR% && npm run dev"
echo        Window: "AIAC - Frontend (5173)"
echo.

:: SUMMARY
echo  ============================================
echo    All services started successfully!
echo  ============================================
echo.
echo  Access Points:
echo    Frontend:    http://localhost:5173
echo    Backend:     http://localhost:8080
echo    AI Server:   http://localhost:5000
echo.
echo  Login Credentials:
echo    Admin:        admin / 123
echo    Invigilator:  invisi / 1234
echo.
echo  Close individual windows to stop each service.
echo  Press any key to close this launcher...
pause >nul
