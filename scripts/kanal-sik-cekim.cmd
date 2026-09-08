@echo off
rem Selliora KANAL cekimi (SIK) - OPERASYON KLONUNDAN kosar (K162-3).
rem Klon = GitHub'a push'lanmis (bekciden gecmis) kod; gelistirme
rem agacindaki tur/mutasyon pencereleri cekimi ETKILEMEZ.
rem Yoruma KOMUT yazilmaz (K158). Kurulum/kaldirma: BEKLEYENLER.md K162.
rem
rem NIYE UC KANAL TEK GOREVDE - mimar istegi 08.09.2026: "Trendyol hangi
rem sistematik ile cronjob calistiriyorsa Hepsiburada ve N11'de ayni olsun."
rem Uc AYRI gorev kurulsaydi ayni klona 5 dakikada UC "git pull" duserdi ve
rem index.lock cakismasi sessiz basarisizlik uretirdi. Tek gorev tek hazirlik
rem yapar, kanallari SIRAYLA kosar.
rem
rem SIRA TY -> HB -> N11: mimar karari 07.09.2026 "devamli ilk gonderim
rem trendyol, ikinci hepsiburada". Sure olculdu 08.09: TY 6-26 sn, HB 9 sn,
rem N11 4 sn - toplam en kotu ~40 sn, 5 dakikalik araliga rahat siginiyor.
rem
rem HER KANALIN LOGU AYRI: kanal bazinda "kac kosum kirmizi" sorusu ancak
rem oyle sorulabiliyor. Hazirligin sonucu UC LOGA DA yazilir, yoksa "HB
rem neden cekmiyor" diye bakan kisi klon hatasini hic gormezdi.
setlocal
set KOK=C:\Users\yapra\Desktop\axcali
set TYLOG=%KOK%\raporlar\ty-cekim.log
set HBLOG=%KOK%\raporlar\hb-cekim.log
set N11LOG=%KOK%\raporlar\n11-cekim.log
set HAZLOG=%KOK%\raporlar\klon-tazele.log

echo ============================================== >> %HAZLOG%
echo HAZIRLIK %date% %time% >> %HAZLOG%
call %KOK%\scripts\klon-tazele.cmd "%HAZLOG%"
set HAZ=%errorlevel%
echo HAZIRLIK-BITTI cikis=%HAZ% >> %HAZLOG%

echo ============================================== >> %TYLOG%
echo BASLADI-SIK %date% %time% hazirlik=%HAZ% >> %TYLOG%
call npm run canli:ty-ice-aktar -- --gun=3 --yaz >> %TYLOG% 2>&1
echo BITTI-SIK %date% %time% cikis=%errorlevel% >> %TYLOG%

echo ============================================== >> %HBLOG%
echo BASLADI-SIK %date% %time% hazirlik=%HAZ% >> %HBLOG%
call npm run canli:hb-ice-aktar -- --yaz >> %HBLOG% 2>&1
echo BITTI-SIK %date% %time% cikis=%errorlevel% >> %HBLOG%

echo ============================================== >> %N11LOG%
echo BASLADI-SIK %date% %time% hazirlik=%HAZ% >> %N11LOG%
call npm run canli:n11-ice-aktar -- --yaz >> %N11LOG% 2>&1
echo BITTI-SIK %date% %time% cikis=%errorlevel% >> %N11LOG%
endlocal
