@echo off
rem Selliora TY gunluk cekim - Gorev Zamanlayici her sabah kosar.
rem Kurulum/kaldirma: BEKLEYENLER.md K158 (yoruma KOMUT yazilmaz -
rem 04.09.2026 dersi: bozuk parse yorumdaki komutu calistirdi, gorevi sildi).
rem Log kirpilmaz: raporlar/ty-cekim.log
cd /d C:\Users\yapra\Desktop\axcali
echo ============================================== >> raporlar\ty-cekim.log
echo BASLADI %date% %time% >> raporlar\ty-cekim.log
call npm run canli:ty-ice-aktar -- --yaz >> raporlar\ty-cekim.log 2>&1
echo BITTI %date% %time% cikis=%errorlevel% >> raporlar\ty-cekim.log
