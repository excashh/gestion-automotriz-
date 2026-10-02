@echo off
title AutoPro - Sistema de Gestion Automotriz
echo ===================================================
echo    Iniciando AutoPro Taller Automotriz
echo ===================================================
echo.

echo 1. Iniciando Servidor Backend en puerto 4000...
start "AutoPro Backend" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 /nobreak >nul

echo 2. Iniciando Servidor Frontend en puerto 5173...
start "AutoPro Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo 3. Abriendo navegador...
start http://localhost:5173

echo.
echo ===================================================
echo    AutoPro esta listo y corriendo!
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:4000/api
echo ===================================================
pause
