@echo off
chcp 65001 >nul
setlocal
rem FYOF 로컬 실행 끄기: 프론트(8080), 백엔드(8081), DB(3306) 순서로 끈다.
set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.4\bin"

for %%P in (8080 8081) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo 포트 %%P 끄는 중 (PID %%I^)
    taskkill /PID %%I /T /F >nul 2>&1
  )
)

rem DB 는 데이터가 깨지지 않게 정상 종료 명령으로 끈다
"%MYSQL_BIN%\mysqladmin.exe" -uroot -h127.0.0.1 shutdown >nul 2>&1
if %errorlevel%==0 (echo DB 껐어요.) else (echo DB는 이미 꺼져 있어요.)

rem gradle 이 남겨 둔 백그라운드 프로세스도 정리
if exist "%~dp0backend-demo\gradlew.bat" (
  pushd "%~dp0backend-demo"
  set "JAVA_HOME=C:\Users\User\.jdks\jdk-21.0.12.1+1"
  call .\gradlew.bat --stop >nul 2>&1
  popd
)
echo 다 껐어요.
timeout /t 3 >nul
