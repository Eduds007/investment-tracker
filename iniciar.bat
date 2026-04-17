@echo off
REM =====================================================
REM   SCRIPT PARA INICIAR BACKEND + FRONTEND
REM =====================================================
setlocal enabledelayedexpansion

cls
echo.
echo =====================================================
echo   INICIANDO APLICACAO DE INVESTIMENTOS
echo =====================================================
echo.

REM Verificar Python
echo [1/5] Verificando Python...
set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    color c
    echo.
    echo [ERRO] Ambiente virtual .venv nao encontrado!
    echo.
    pause
    exit /b 1
)
"%PYTHON_EXE%" --version >nul 2>&1
if errorlevel 1 (
    color c
    echo.
    echo [ERRO] Python nao encontrado!
    echo.
    pause
    exit /b 1
)
echo [OK] Python encontrado
echo.

REM Ir para backend
echo [2/5] Configurando Backend...
cd /d "%~dp0invesmenttracker"
"%PYTHON_EXE%" -m pip install -q django djangorestframework django-cors-headers 2>nul
"%PYTHON_EXE%" manage.py migrate >nul 2>&1
echo [OK] Backend pronto
echo.

REM Ir para frontend
echo [3/5] Configurando Frontend...
cd /d "%~dp0..\frontend"
call npm install --legacy-peer-deps --silent 2>nul
echo [OK] Frontend pronto
echo.

REM Voltar para raiz
cd /d "%~dp0.."
echo [4/5] Preparando para iniciar servidores...
echo.

REM Iniciar Django
echo [5/5] Iniciando servidores...
echo.
start "Backend - Django (8000)" cmd /k "cd /d ""%~dp0invesmenttracker"" && ""%PYTHON_EXE%"" manage.py runserver"

REM Esperar Django iniciar
timeout /t 3 /nobreak >nul

REM Iniciar React
start "Frontend - React (5173)" cmd /k "cd %~dp0frontend && npm run dev"

echo.
echo =====================================================
echo   APLICACAO INICIADA COM SUCESSO!
echo =====================================================
echo.
echo.
echo Digite os enderecos no navegador:
echo   - Dashboard:  http://localhost:5173
echo   - API:        http://localhost:8000/api
echo   - Admin:      http://localhost:8000/admin
echo.
echo Este script pode ser fechado.
echo Os servidores continuam rodando.
echo.
pause
endlocal
