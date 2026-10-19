@echo off
powershell.exe -NoProfile -File "%~dp0Open-OFM-Console.ps1" %*
if errorlevel 1 pause
