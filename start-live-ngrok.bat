@echo off
REM Start Live Server
start "" "C:\Users\localhost\AppData\Local\Programs\Microsoft VS Code\Code.exe" "C:\Users\localhost\OneDrive\Documents\gpt\Job_Assist\job_assist.html" --reuse-window

REM Wait 5 seconds for Live Server to start
timeout /t 5 /nobreak > nul

REM Start ngrok and save the URL to a temp file
start "" "C:\ngrok\ngrok.exe" http 5500 > "%TEMP%\ngrok_output.txt" 2>&1

REM Wait 5 seconds for ngrok to start
timeout /t 5 /nobreak > nul

REM Extract the forwarding URL and copy to clipboard
for /f "tokens=2" %%i in ('findstr /R "https://.*\.ngrok-free\.dev" "%TEMP%\ngrok_output.txt"') do (
    echo %%i | clip
    echo Ngrok URL copied to clipboard: %%i
)

pause