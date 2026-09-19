@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dbquery.ps1" %*
exit /b %ERRORLEVEL%
