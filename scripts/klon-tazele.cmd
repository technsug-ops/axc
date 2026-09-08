@echo off
rem Selliora - OPERASYON KLONUNU KOSUMA HAZIRLAR (TEK GOVDE).
rem Cagiran: ty-sik-cekim.cmd, ty-gunluk-cekim.cmd ve eklenecek kanallar.
rem Tek parametre: log dosyasinin tam yolu.
rem
rem NIYE VAR - OLCULDU 08.09.2026. Klon "git pull" ile SEMAYI aliyordu ama
rem uretilmis Prisma istemcisini TAZELEMIYORDU:
rem     prisma/schema.prisma      07.09 16:12   onaylandiAt VAR
rem     src/generated/prisma/     04.09 12:03   onaylandiAt YOK
rem Sonuc: her kosum "Unknown argument 'onaylandiAt'" ile 7. adimda
rem cokuyordu. Cekim ve AuditLog yazimi 6. adimda bittigi icin siparisler
rem DEFTERE GIRIYOR, yalniz otomatik onay dusuyordu - bu yuzden arizanin
rem bedeli veri kaybi degil, Halil'in elle yaptigi 22 onay oldu.
rem Olculdu: 05.09 12:22 - 08.09 07:22 arasi 690 kosum cikis=1.
rem
rem OLCUT OLAYA DEGIL HALE BAGLI. "HEAD kimildadi mi" bugunku bozuk hali
rem HIC GORMEZDI: klon zaten origin/main'deydi (geride 0 commit) ve istemci
rem yine de bayatti. Dogru olcut yeniden hesaplanabilir olan: uretilmis
rem istemci semadan ESKI mi. Bu olcut kendini iyilestirir ve tazeleme
rem yapildiktan sonra kendiliginden susar.
rem
rem CAPA DOSYASI models\Sale.ts - client.ts DEGIL: kirilan alan
rem (onaylandiAt) orada yasiyor. client.ts'e bakan bir olcut, alan
rem eklenmesini goremeyebilirdi.
cd /d C:\Users\yapra\Desktop\axcali-operasyon
git pull --ff-only --quiet >> %~1 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=(Get-Item 'prisma\schema.prisma').LastWriteTime; $c=Get-Item 'src\generated\prisma\models\Sale.ts' -ErrorAction SilentlyContinue; if ($null -eq $c -or $c.LastWriteTime -lt $s) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo PRISMA-TAZELEME: uretilmis istemci semadan ESKI - generate kosuyor >> %~1
  call npx prisma generate >> %~1 2>&1
) else (
  echo PRISMA-TAZELEME: istemci guncel - atlandi >> %~1
)
copy /Y C:\Users\yapra\Desktop\axcali\.env.canli .env.canli > nul
