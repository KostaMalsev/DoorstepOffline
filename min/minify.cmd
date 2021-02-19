@echo off
title Prep for Minifier
cls

echo Appending libraries
cd C:\Users\limor\Downloads\doorstepnetlify\src\lib\
copy /b peerjs.min.js+three.min.js+CSS2DRenderer.js C:\Users\limor\Downloads\doorstepnetlify\min\lib.js

echo Appending scripts
cd C:\Users\limor\Downloads\doorstepnetlify\src\slave\
copy /b DeviceOrientationController.js+world.js+gyro.js C:\Users\limor\Downloads\doorstepnetlify\min\doorstep.js

echo.
echo "Done. Minify @ https://jscompress.com/ & Obfusticate @ https://www.obfuscator.io/"
pause > nul
