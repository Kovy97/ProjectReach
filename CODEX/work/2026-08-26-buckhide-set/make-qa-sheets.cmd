@echo off
REM codex:2026-08-26T21:18:00+02:00
set "SET=G:\GameDev\CODEX\assets\buckhide-set-2026-08-26"
set "ITEMS=G:\GameDev\apps\client\src\renderer\assets\items"
set "INPUTS=-i %SET%\fertig\buckhide_helm.png -i %SET%\fertig\buckhide_body.png -i %SET%\fertig\buckhide_legs.png -i %SET%\fertig\buckhide_vambraces.png -i %SET%\fertig\buckhide_boots.png -i %SET%\fertig\hunting_bow.png"
set "GRID=[0:v]scale=256:256,format=rgba[a0];[1:v]scale=256:256,format=rgba[a1];[2:v]scale=256:256,format=rgba[a2];[3:v]scale=256:256,format=rgba[a3];[4:v]scale=256:256,format=rgba[a4];[5:v]scale=256:256,format=rgba[a5];[a0][a1][a2][a3][a4][a5]xstack=inputs=6:layout=0_0^|256_0^|512_0^|0_256^|256_256^|512_256:fill=0x00000000[grid]"

ffmpeg -y -v error %INPUTS% -filter_complex "%GRID%;color=c=0x171311:s=768x512:d=0.04[bg];[bg][grid]overlay=shortest=1:format=auto[out]" -map "[out]" -frames:v 1 "%SET%\qa\contact-sheet-dark.png"
ffmpeg -y -v error %INPUTS% -filter_complex "%GRID%;color=c=0xd8d2c8:s=768x512:d=0.04[bg];[bg][grid]overlay=shortest=1:format=auto[out]" -map "[out]" -frames:v 1 "%SET%\qa\contact-sheet-light.png"
ffmpeg -y -v error %INPUTS% -filter_complex "%GRID%;color=c=0xff00ff:s=768x512:d=0.04[bg];[bg][grid]overlay=shortest=1:format=auto[out]" -map "[out]" -frames:v 1 "%SET%\qa\contact-sheet-magenta.png"

REM codex:2026-08-26T21:18:00+02:00
set "TINY=[0:v]scale=48:48,format=rgba[t0];[1:v]scale=48:48,format=rgba[t1];[2:v]scale=48:48,format=rgba[t2];[3:v]scale=48:48,format=rgba[t3];[4:v]scale=48:48,format=rgba[t4];[5:v]scale=48:48,format=rgba[t5];[t0][t1][t2][t3][t4][t5]xstack=inputs=6:layout=0_0^|48_0^|96_0^|144_0^|192_0^|240_0:fill=0x00000000[tiny]"
ffmpeg -y -v error %INPUTS% -filter_complex "%TINY%;color=c=0x171311:s=288x48:d=0.04[bg];[bg][tiny]overlay=shortest=1:format=auto[out]" -map "[out]" -frames:v 1 "%SET%\qa\contact-sheet-icon-48.png"

REM codex:2026-08-26T21:18:00+02:00
ffmpeg -y -v error -i "%ITEMS%\cured_leather_body.webp" -i "%SET%\fertig\buckhide_body.png" -i "%ITEMS%\bronze_shortbow.webp" -i "%SET%\fertig\hunting_bow.png" -filter_complex "[0:v]scale=256:256,format=rgba[r0];[1:v]scale=256:256,format=rgba[r1];[2:v]scale=256:256,format=rgba[r2];[3:v]scale=256:256,format=rgba[r3];[r0][r1][r2][r3]xstack=inputs=4:layout=0_0^|256_0^|512_0^|768_0:fill=0x00000000[grid];color=c=0x171311:s=1024x256:d=0.04[bg];[bg][grid]overlay=shortest=1:format=auto[out]" -map "[out]" -frames:v 1 "%SET%\qa\contact-sheet-reference.png"

