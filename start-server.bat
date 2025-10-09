@echo off
echo ========================================
echo   GRC Compliance Mapping AI
echo   Demarrage du serveur...
echo ========================================
echo.

REM Verifier si Node.js est installe
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: Node.js n'est pas installe ou n'est pas dans le PATH
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Verifier si les dependances sont installees
if not exist "node_modules" (
    echo Installation des dependances...
    call npm install
    echo.
)

REM Construire l'application si dist n'existe pas
if not exist "dist" (
    echo Construction de l'application...
    call npm run build
    echo.
)

echo Demarrage du serveur sur http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.
echo ========================================
echo.

REM Demarrer le serveur simple
node serve.js

pause

