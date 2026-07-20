@echo off
REM ===========================================================================
REM  eReseta+ - Start the system (Windows)
REM
REM  Opens three windows:
REM    1. Laravel API        http://localhost:8000
REM    2. Queue worker       (blockchain anchoring + queued email)
REM    3. React frontend     http://localhost:5173
REM
REM  Close any window to stop that service.
REM ===========================================================================

cd /d "%~dp0"

echo.
echo  ==========================================================
echo    Starting eReseta+
echo  ==========================================================
echo.

if not exist "api\vendor" (
  echo  [X] Backend dependencies are missing. Run install.bat first.
  echo.
  pause
  exit /b 1
)
if not exist "web\node_modules" (
  echo  [X] Frontend dependencies are missing. Run install.bat first.
  echo.
  pause
  exit /b 1
)

echo  Starting the API server...
start "eReseta+ API" cmd /k "cd /d %~dp0api && php artisan serve"

echo  Starting the queue worker...
start "eReseta+ Queue" cmd /k "cd /d %~dp0api && php artisan queue:work"

echo  Starting the frontend...
start "eReseta+ Web" cmd /k "cd /d %~dp0web && npm run dev"

timeout /t 6 /nobreak >nul
start http://localhost:5173

echo.
echo  ==========================================================
echo    eReseta+ is running
echo  ==========================================================
echo.
echo    Frontend  http://localhost:5173
echo    API       http://localhost:8000
echo.
echo    Three windows have opened - one per service.
echo    Close a window to stop that service.
echo.
pause
