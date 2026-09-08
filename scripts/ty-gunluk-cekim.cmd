@echo off
rem Selliora TY cekim (GUNLUK) - OPERASYON KLONUNDAN kosar (K162-3).
rem Klon = GitHub'a push'lanmis (bekciden gecmis) kod; gelistirme
rem agacindaki tur/mutasyon pencereleri cekimi ETKILEMEZ.
rem Yoruma KOMUT yazilmaz (K158). Kurulum/kaldirma: BEKLEYENLER.md K162.
rem Klon hazirligi (pull + Prisma tazeleme + .env) TEK GOVDEDE: klon-tazele.
set LOG=C:\Users\yapra\Desktop\axcali\raporlar\ty-cekim.log
echo ============================================== >> %LOG%
echo BASLADI-GUNLUK %date% %time% >> %LOG%
call C:\Users\yapra\Desktop\axcali\scripts\klon-tazele.cmd "%LOG%"
call npm run canli:ty-ice-aktar -- --yaz >> %LOG% 2>&1
echo BITTI-GUNLUK %date% %time% cikis=%errorlevel% >> %LOG%
