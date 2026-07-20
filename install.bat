@echo off
REM ===========================================================================
REM  eReseta+ - Automated Installer (Windows)
REM
REM  Healthcare Appointment Booking and Patient Record Management System
REM  with Digital Prescription using Hyperledger Fabric
REM  Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI)
REM
REM  USAGE: double-click install.bat, or run it from a command prompt
REM         inside the project folder.
REM ===========================================================================

setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo  ==========================================================
echo    eReseta+ Installer
echo  ==========================================================
echo.

REM ---------------------------------------------------------------- checks
echo  [1/7] Checking prerequisites...

set MISSING=0

where php >nul 2>&1
if errorlevel 1 (
  echo        [X] PHP not found. Install PHP 8.4+ ^(or start Laragon^).
  set MISSING=1
) else (
  for /f "tokens=2" %%v in ('php -r "echo 'PHP '.PHP_VERSION;"') do echo        [OK] PHP %%v
)

where composer >nul 2>&1
if errorlevel 1 (
  echo        [X] Composer not found. Install from https://getcomposer.org/
  set MISSING=1
) else (
  echo        [OK] Composer found
)

where node >nul 2>&1
if errorlevel 1 (
  echo        [X] Node.js not found. Install Node 20+ from https://nodejs.org/
  set MISSING=1
) else (
  for /f %%v in ('node -v') do echo        [OK] Node.js %%v
)

where npm >nul 2>&1
if errorlevel 1 (
  echo        [X] npm not found ^(normally ships with Node.js^).
  set MISSING=1
) else (
  echo        [OK] npm found
)

if "%MISSING%"=="1" (
  echo.
  echo  Install the missing software above, then run this installer again.
  echo.
  pause
  exit /b 1
)

REM ---------------------------------------------------------------- backend
echo.
echo  [2/7] Installing backend dependencies ^(this may take a few minutes^)...
pushd api
call composer install --no-interaction
if errorlevel 1 (
  echo        [X] composer install failed.
  popd & pause & exit /b 1
)
echo        [OK] Backend dependencies installed

REM ---------------------------------------------------------------- env
echo.
echo  [3/7] Preparing configuration...
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo        [OK] Created api\.env from the template
) else (
  echo        [OK] api\.env already exists ^(left unchanged^)
)

call php artisan key:generate --force
if errorlevel 1 (
  echo        [X] Could not generate the application key.
  popd & pause & exit /b 1
)
echo        [OK] Application key generated

REM ---------------------------------------------------------------- database
echo.
echo  [4/7] Setting up the database...
echo.
echo        Make sure your MySQL server is RUNNING ^(e.g. Laragon - Start All^).
echo        The installer will create a database named: ereseta
echo.
set /p DBUSER="       MySQL username [root]: "
if "!DBUSER!"=="" set DBUSER=root
set /p DBPASS="       MySQL password (blank if none): "

where mysql >nul 2>&1
if errorlevel 1 (
  echo        [!] mysql client not on PATH - skipping automatic database creation.
  echo            Create it manually, then re-run:
  echo              CREATE DATABASE ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
) else (
  if "!DBPASS!"=="" (
    mysql -u !DBUSER! -e "CREATE DATABASE IF NOT EXISTS ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
  ) else (
    mysql -u !DBUSER! -p!DBPASS! -e "CREATE DATABASE IF NOT EXISTS ereseta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
  )
  if errorlevel 1 (
    echo        [!] Could not create the database automatically.
    echo            Check that MySQL is running and the credentials are correct.
  ) else (
    echo        [OK] Database 'ereseta' ready
  )
)

REM write the credentials into .env
powershell -NoProfile -Command ^
  "$p='.env'; $c=Get-Content $p -Raw;" ^
  "$c=$c -replace '(?m)^DB_DATABASE=.*','DB_DATABASE=ereseta';" ^
  "$c=$c -replace '(?m)^DB_USERNAME=.*','DB_USERNAME=%DBUSER%';" ^
  "$c=$c -replace '(?m)^DB_PASSWORD=.*','DB_PASSWORD=%DBPASS%';" ^
  "Set-Content $p $c -NoNewline"
echo        [OK] Database settings written to api\.env

REM ---------------------------------------------------------------- migrate
echo.
echo  [5/7] Creating tables and demo data...
call php artisan migrate --force
if errorlevel 1 (
  echo        [X] Migration failed. Is MySQL running and are the credentials correct?
  popd & pause & exit /b 1
)
call php artisan db:seed --force
call php artisan storage:link 2>nul
echo        [OK] Database ready with demo data

popd

REM ---------------------------------------------------------------- frontend
echo.
echo  [6/7] Installing frontend dependencies ^(this may take a few minutes^)...
pushd web
call npm install
if errorlevel 1 (
  echo        [X] npm install failed.
  popd & pause & exit /b 1
)
echo        [OK] Frontend dependencies installed
popd

REM ---------------------------------------------------------------- done
echo.
echo  [7/7] Installation complete.
echo.
echo  ==========================================================
echo    INSTALLATION SUCCESSFUL
echo  ==========================================================
echo.
echo    To start the system, run:  start.bat
echo.
echo    It will open:
echo      Frontend  http://localhost:5173
echo      API       http://localhost:8000
echo.
echo    Log in using the accounts in the Credentials document.
echo.
echo    NOTE: locally, emails ^(OTP codes, activation links^) are written
echo          to api\storage\logs\laravel.log instead of being sent.
echo.
pause
endlocal
