@echo off
rem Lancement local du jeu (Ctrl+C pour arreter)
cd /d "%~dp0"
node server.js
pause
