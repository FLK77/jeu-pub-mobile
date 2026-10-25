@echo off
if not exist "%~dp0jeu-pc.html" (
  echo Extrayez tout le ZIP avant de lancer le jeu.
  pause
  exit /b 1
)
start "" "%~dp0jeu-pc.html"
