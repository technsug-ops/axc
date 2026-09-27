@echo off
rem Selliora GECE BEKCI TURU (K290, 27.09.2026) - zamanlayici her gece 00:30'da kosar.
rem
rem ============================================================
rem  NIYE VAR: push artik bekcilerin HEPSINI + yalniz degisen dosyalara
rem  dokunan mutasyon denetimlerini kosuyor (kullanici karari 27.09.2026:
rem  push basina 40-45 dk surdurulemezdi). TAM tur burada, her gece.
rem  Kirmizida geriye tarama (git bisect) bozan push'u bulur; sonuc canli
rem  AuditLog'a GECE_BEKCI_TURU olarak yazilir, panelde can yanar.
rem
rem  ! "Gun sonunda elle kosarim" bir NIYETTIR (anayasa); zamanlayici
rem  mekanizmadir. Bilgisayar gece kapaliysa tur kacar ve ekran bunu
rem  36 saat sonra KIRMIZI yazar - kacan gece sessiz gecmez.
rem ============================================================
setlocal
set KOK=C:\Users\yapra\Desktop\axcali
set LOG=%KOK%\raporlar\gece-turu-zamanlayici.log
if not exist %KOK%\raporlar mkdir %KOK%\raporlar
echo ============================================== >> %LOG%
echo BASLADI %date% %time% >> %LOG%
cd /d %KOK%
call npx tsx scripts\gece-turu.ts >> %LOG% 2>&1
echo BITTI %date% %time% kod %errorlevel% >> %LOG%
endlocal
