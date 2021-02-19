@echo off
title Prep for Obfuscation
cls

powershell -Command "(gc doorstep.min.js) -replace 'sendGyroData', 'sendDataPacket' | Out-File -encoding ASCII doorstep.min.js"
powershell -Command "(gc doorstep.min.js) -replace 'CSS2DObject', 'COOLObject' | Out-File -encoding ASCII doorstep.min.js"
powershell -Command "(gc doorstep.min.js) -replace 'CSS2DRenderer', 'COOLRenderer' | Out-File -encoding ASCII doorstep.min.js"
powershell -Command "(gc doorstep.min.js) -replace 'THREE', 'COCO' | Out-File -encoding ASCII doorstep.min.js"
powershell -Command "(gc doorstep.min.js) -replace 'cssRenderer', 'coolRenderer' | Out-File -encoding ASCII doorstep.min.js"

echo Done.
pause
