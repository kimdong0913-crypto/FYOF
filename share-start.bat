@echo off
chcp 65001 >nul
rem  FYOF 임시 공개 주소 만들기 (Cloudflare 터널). 이 창을 닫으면 주소가 사라진다.
rem  먼저 start-local.bat 으로 사이트를 켜 둬야 한다.
setlocal
set CF=%USERPROFILE%\cloudflared\cloudflared.exe

netstat -ano | findstr /R /C:":8080 .*LISTENING" >nul
if errorlevel 1 (
  echo [!] 사이트가 꺼져 있어요. 먼저 start-local.bat 을 실행한 뒤 다시 실행해 주세요.
  pause
  exit /b 1
)
if not exist "%CF%" (
  echo [!] %CF% 가 없어요. cloudflared 를 다시 받아야 해요.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   잠시 뒤 아래에  https://....trycloudflare.com  주소가 나와요.
echo   그 주소를 복사해서 보여 줄 사람에게만 보내 주세요.
echo   다 보면 이 창을 닫으세요. 닫으면 주소가 바로 사라져요.
echo ============================================================
echo.
"%CF%" tunnel --no-autoupdate --url http://localhost:8080
