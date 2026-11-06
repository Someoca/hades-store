@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0precheck-hades.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" (
  echo Pre-check encontrou pendencias. Veja as mensagens acima.
) else (
  echo Pre-check concluido. Nenhuma compilacao foi executada.
)
pause
exit /b %RESULT%
