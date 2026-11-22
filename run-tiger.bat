@echo off
chcp 65001 >nul
title TIGER
cd /d "%~dp0"

set "ELECTRON_RUN_AS_NODE="
set "PATH=C:\Users\samer\node-win\node-v20.18.0-win-x64;%PATH%"

start "" "node_modules\electron\dist\electron.exe" .
