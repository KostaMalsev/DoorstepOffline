@echo off
title Prep for Minifier
cls

echo Appending scripts
cd C:\Users\limor\Downloads\doorstepnetlify\src\slave\
copy /b C:\Users\limor\Downloads\doorstepnetlify\src\lib\CSS2DRenderer.js+DeviceOrientationController.js+world.js+gyro.js C:\Users\limor\Downloads\doorstepnetlify\min\doorstep.js

echo.
echo "Done. Minify @ https://jscompress.com/ & Obfusticate @ https://www.obfuscator.io/"
pause > nul
