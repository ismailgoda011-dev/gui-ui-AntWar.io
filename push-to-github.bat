@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

:: ===================================================
::  AntWar GUI -- GitHub Auto Push
::  Repo: https://github.com/ismailgoda011-dev/gui-ui-AntWar.io
:: ===================================================

set "REPO_URL=https://github.com/ismailgoda011-dev/gui-ui-AntWar.io.git"
set "BRANCH=main"
set "PROJECT_DIR=%~dp0"

:: Remove trailing backslash
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

cd /d "%PROJECT_DIR%"

echo.
echo =====================================================
echo   AntWar GUI ^| GitHub Auto Push
echo   Target : %REPO_URL%
echo   Folder : %PROJECT_DIR%
echo =====================================================
echo.

:: Check git is installed
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH.
    echo         Download it from: https://git-scm.com/downloads
    pause
    exit /b 1
)

:: Initialize repo if not already done
if not exist ".git" (
    echo [INFO] No git repository found. Initializing for first time...
    git init
    git branch -M %BRANCH%
    git remote add origin "%REPO_URL%"
    echo [INFO] Git repo initialized and remote set.
) else (
    git remote get-url origin >nul 2>&1
    if errorlevel 1 (
        git remote add origin "%REPO_URL%"
        echo [INFO] Remote origin added.
    ) else (
        git remote set-url origin "%REPO_URL%"
    )
)

:: Ensure .gitignore exists
if not exist ".gitignore" (
    echo [INFO] Creating .gitignore...
    (
        echo # Dependencies
        echo node_modules/
        echo.
        echo # Images folder ^(large assets^)
        echo img/
        echo.
        echo # Compressed / archive files
        echo *.zip
        echo *.rar
        echo *.7z
        echo *.tar
        echo *.tar.gz
        echo *.gz
        echo.
        echo # OS files
        echo .DS_Store
        echo Thumbs.db
        echo.
        echo # Temp folders
        echo _extracted/
    ) > .gitignore
    echo [INFO] .gitignore created.
)

:: Remove large/ignored folders from git cache if they were ever tracked
git rm -r --cached img/ >nul 2>&1
git rm -r --cached node_modules/ >nul 2>&1

:: Stage all changes respecting .gitignore
echo [INFO] Staging all changes...
git add -A

:: Check if there is anything to commit
git diff --cached --quiet
if %errorlevel%==0 (
    echo [INFO] Nothing new to commit. Repository is already up to date.
    goto tryPush
)

:: Generate commit message with current timestamp via wmic
for /f "skip=1 tokens=1" %%D in ('wmic os get localdatetime') do (
    if not defined WMIC_DT set "WMIC_DT=%%D"
)
set "COMMIT_MSG=Update GUI !WMIC_DT:~0,8! !WMIC_DT:~8,6!"

echo [INFO] Committing: !COMMIT_MSG!
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
    echo [ERROR] Commit failed. See output above.
    pause
    exit /b 1
)

:tryPush
echo [INFO] Pushing to GitHub...

:: First attempt: normal push
git push -u origin %BRANCH%
if %errorlevel%==0 goto pushSuccess

:: Second attempt: pull with rebase then push
echo [INFO] Normal push failed. Trying pull --rebase first...
git pull origin %BRANCH% --rebase
git push -u origin %BRANCH%
if %errorlevel%==0 goto pushSuccess

:: Third attempt: force push (for first-time or diverged history)
echo [WARN] Still failing. Trying force push...
git push -u origin %BRANCH% --force
if errorlevel 1 (
    echo.
    echo [ERROR] Push failed. Possible reasons:
    echo   1. Not authenticated to GitHub. Run this once to save credentials:
    echo         git config --global credential.helper manager
    echo      Then run this bat file again.
    echo   2. Repository does not exist yet on GitHub. Create it at:
    echo         https://github.com/new
    echo      Repository name: gui-ui-AntWar.io
    echo      Set visibility to Public or Private then click Create.
    echo.
    pause
    exit /b 1
)

:pushSuccess
echo.
echo [SUCCESS] Project pushed successfully to:
echo   %REPO_URL%
echo.
echo   Files excluded from push:
echo     - img/         ^(large assets^)
echo     - node_modules/ ^(dependencies^)
echo     - *.zip *.rar *.7z *.tar *.gz ^(compressed files^)
echo.
pause
exit /b 0
