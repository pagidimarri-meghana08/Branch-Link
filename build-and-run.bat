@echo off
echo ===================================================
echo BranchLink - Build and Run Unified Full-Stack App
echo ===================================================

echo [1/3] Building React Frontend with Vite...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: Frontend build failed.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Embedding Frontend Assets into Spring Boot...
cd ..
if not exist "backend\src\main\resources\static" mkdir "backend\src\main\resources\static"
xcopy /E /I /Y "frontend\dist\*" "backend\src\main\resources\static\"

echo [3/3] Packaging Spring Boot Executable JAR...
cd backend
call mvn clean package -DskipTests
if %ERRORLEVEL% neq 0 (
    echo Error: Backend package failed.
    pause
    exit /b %ERRORLEVEL%
)

echo ===================================================
echo Build Successful! Starting BranchLink on http://localhost:8080 ...
echo ===================================================
java -jar target\branchlink-1.0.jar
pause
