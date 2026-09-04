@echo off
rem Selliora TY cekim (GUNLUK) - OPERASYON KLONUNDAN kosar (K162-3).
rem Klon = GitHub'a push'lanmis (bekciden gecmis) kod; gelistirme
rem agacindaki tur/mutasyon pencereleri cekimi ETKILEMEZ.
rem Yoruma KOMUT yazilmaz (K158). Kurulum/kaldirma: BEKLEYENLER.md K162.
cd /d C:\Users\yapra\Desktop\axcali-operasyon
echo ============================================== >> C:\Users\yapra\Desktop\axcali\raporlar\ty-cekim.log
echo BASLADI-GUNLUK %date% %time% >> C:\Users\yapra\Desktop\axcali\raporlar\ty-cekim.log
git pull --ff-only --quiet >> C:\Users\yapra\Desktop\axcali\raporlar\ty-cekim.log 2>&1
copy /Y C:\Users\yapra\Desktop\axcali\.env.canli .env.canli > nul
call npm run canli:ty-ice-aktar -- --yaz >> C:\Users\yapra\Desktop\axcali\raporlar\ty-cekim.log 2>&1
echo BITTI-GUNLUK %date% %time% cikis=%errorlevel% >> C:\Users\yapra\Desktop\axcali\raporlar\ty-cekim.log
