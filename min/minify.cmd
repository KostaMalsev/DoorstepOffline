@echo off
title Prep for Minifier
cls

echo Appending libraries
cd C:\Users\limor\Downloads\doorstepnetlify\src\lib\
copy /b peerjs.min.js+three.min.js+CSS2DRenderer.js C:\Users\limor\Downloads\doorstepnetlify\min\tmp.js

echo Appending scripts
cd C:\Users\limor\Downloads\doorstepnetlify\src\slave\
copy /b DeviceOrientationController.js+world.js+gyro.js C:\Users\limor\Downloads\doorstepnetlify\min\doorstep.js

echo Appending libraries to scripts
cd C:\Users\limor\Downloads\doorstepnetlify\min\
type doorstep.js >> tmp.js
type tmp.js > doorstep.js

echo Deleting tmp file
del tmp.js /F /Q

echo Removing keywords
powershell -Command "(gc doorstep.js) -replace 'sendGyroData', 'sendDataPacket' | Out-File -encoding ASCII doorstep.js"
powershell -Command "(gc doorstep.js) -replace 'CSS2DObject', 'COOLObject' | Out-File -encoding ASCII doorstep.js"
powershell -Command "(gc doorstep.js) -replace 'CSS2DRenderer', 'COOLRenderer' | Out-File -encoding ASCII doorstep.js"
powershell -Command "(gc doorstep.js) -replace 'THREE', 'COCO' | Out-File -encoding ASCII doorstep.js"
powershell -Command "(gc doorstep.js) -replace 'cssRenderer', 'coolRenderer' | Out-File -encoding ASCII doorstep.js"

echo.
echo "Done. Minify @ https://jscompress.com/ & Obfusticate @ https://www.obfuscator.io/"
pause > nul
