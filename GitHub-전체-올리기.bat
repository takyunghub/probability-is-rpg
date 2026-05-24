@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "OUT=%USERPROFILE%\Desktop\probability-is-rpg-업로드"
set "REPO=https://github.com/takyunghub/probability-is-rpg"

echo.
echo  GitHub에 web 폴더 전체를 올리기 위한 준비
echo  (game.html 만 있으면 화면이 깨지고 메인만 README로 보입니다)
echo.

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"

xcopy /E /I /Y "%~dp0web\*" "%OUT%\" >nul
copy /Y "%~dp0index.html" "%OUT%\index.html" >nul

echo  복사 완료: %OUT%
echo.
echo  【방법 A】 브라우저에서 파일 추가
echo  1) %REPO%/upload/main 열기
echo  2) 아래 폴더 안의 파일·폴더를 전부 끌어다 놓기
echo  3) Commit changes
echo.
echo  【방법 B】 git (PowerShell)
echo  cd "%OUT%"
echo  git init
echo  git add .
echo  git commit -m "Add full game files"
echo  git branch -M main
echo  git remote add origin %REPO%.git
echo  git push -u origin main --force
echo.
echo  올린 뒤 친구에게낼 링크:
echo  https://takyunghub.github.io/probability-is-rpg/game.html
echo.

start "" explorer "%OUT%"
start "" "%REPO%/upload/main"
pause
