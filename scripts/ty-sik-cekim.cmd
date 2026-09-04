@echo off
rem Selliora TY sik cekim - 30 dakikada bir, dar pencere (3 gun).
rem Genis tarama gunluk gorevde kalir. Yoruma KOMUT yazilmaz (K158 dersi).
rem Kurulum/kaldirma: BEKLEYENLER.md K162.
cd /d C:\Users\yapra\Desktop\axcali
echo ============================================== >> raporlar\ty-cekim.log
echo BASLADI-SIK %date% %time% >> raporlar\ty-cekim.log
call npm run canli:ty-ice-aktar -- --gun=3 --yaz >> raporlar\ty-cekim.log 2>&1
echo BITTI-SIK %date% %time% cikis=%errorlevel% >> raporlar\ty-cekim.log
