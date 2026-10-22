@echo off
chcp 65001 >nul
setlocal
rem ============================================================
rem  FYOF 로컬 실행: DB(MySQL) -> 백엔드(8081) -> 프론트(8080) 순서로 켜고 브라우저를 연다.
rem  창 3개가 따로 뜨고, 끌 때는 stop-local.bat 을 실행한다.
rem ============================================================

rem ----- 이 PC 설정 (경로가 다르면 여기만 고친다) -----
set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin"
set "MYSQL_DATA=C:\Users\User\fyof-mysql-data"
set "JAVA_HOME=C:\Users\User\.jdks\jdk-21.0.12.1+1"
set "ROOT=%~dp0"

echo [1/3] DB (MySQL)
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if %errorlevel%==0 (
  echo       이미 켜져 있어요.
) else (
  start "FYOF DB" /min "%MYSQL_BIN%\mysqld.exe" --datadir="%MYSQL_DATA%" --port=3306 --bind-address=127.0.0.1 --mysqlx=OFF --console
)
set /a tries=0
:wait_db
"%MYSQL_BIN%\mysqladmin.exe" -uroot -h127.0.0.1 ping >nul 2>&1
if %errorlevel%==0 goto db_ready
set /a tries+=1
if %tries% geq 30 (
  echo       DB가 30초 안에 켜지지 않았어요. "FYOF DB" 창의 메시지를 확인해 주세요.
  pause
  exit /b 1
)
timeout /t 1 >nul
goto wait_db
:db_ready
echo       준비 완료

echo [2/3] 백엔드 (localhost:8081)
netstat -ano | findstr /R /C:":8081 .*LISTENING" >nul
if %errorlevel%==0 (
  echo       이미 켜져 있어요.
) else (
  start "FYOF Backend" /d "%ROOT%backend-demo" cmd /k .\gradlew.bat bootRun
)

echo [3/3] 프론트 (localhost:8080)
netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if %errorlevel%==0 (
  echo       이미 켜져 있어요.
) else (
  start "FYOF Frontend" /d "%ROOT%frontend" cmd /k npm run dev -- --port 8080 --strictPort
)

echo.
echo 백엔드와 프론트가 뜰 때까지 기다리는 중이에요. (처음엔 1분쯤 걸려요)
set /a tries=0
:wait_web
curl -s -o nul http://localhost:8081/api/hello
if %errorlevel% neq 0 goto not_yet
curl -s -o nul http://localhost:8080/
if %errorlevel%==0 goto web_ready
:not_yet
set /a tries+=1
if %tries% geq 120 (
  echo 2분이 지나도 안 떠요. "FYOF Backend" / "FYOF Frontend" 창의 에러를 확인해 주세요.
  pause
  exit /b 1
)
timeout /t 1 >nul
goto wait_web
:web_ready
echo 다 켜졌어요. 브라우저를 열게요.
start "" http://localhost:8080/
timeout /t 3 >nul
