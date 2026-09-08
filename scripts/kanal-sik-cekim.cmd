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
rem trendyol, ikinci hepsiburada". Sure olculdu 08.09 (999 kosum):
rem ortanca 10 sn, p95 28 sn, max 176 sn - 5 dakikalik araliga siginiyor.
rem
rem HER KANALIN LOGU AYRI: kanal bazinda "kac kosum kirmizi" sorusu ancak
rem oyle sorulabiliyor. Hazirligin sonucu UC LOGA DA yazilir, yoksa "HB
rem neden cekmiyor" diye bakan kisi klon hatasini hic gormezdi.
rem
rem ============================================================
rem  YARIM KOSUM ISARETI - SESSIZ REDDETME GORUNUR OLSUN (K189)
rem ------------------------------------------------------------
rem  VAKA 08.09.2026: bu pencerede Ctrl+C'ye basildi, cmd "Toplu isi
rem  sonlandir (E/H)?" diye sorup CEVAP BEKLEDI ve batch orada asili
rem  kaldi. Gorev IgnoreNew tasidigi icin sonraki HER kosum sessizce
rem  reddedildi (-2147020576) ve cekim 69 DAKIKA durdu. Hicbir yerde
rem  yazmadi; arizayi kullanici gozuyle yakaladi.
rem
rem  Reddetme Gorev Zamanlayici'da olur, yani bu betik onu goremez.
rem  AMA yarim kalan kosumu BIR SONRAKI kosum gorebilir: isaret dosyasi
rem  baslangicta yazilir, temiz bitiste silinir. Duruyorsa onceki kosum
rem  bitmemis demektir ve bu UC LOGA DA yazilir.
rem  (Anayasa: "kacisin kendisi gorunur kilinir".)
rem
rem  !! SURE SINIRI GOREVDE: ExecutionTimeLimit PT4M. Olculdu - en uzun
rem  kosum 176 sn; 240 sn onun 1,36 kati ve 5 dk araligin 60 sn altinda.
rem  Boylece asili bir ornek bir sonrakini ENGELLEYEMEZ.
rem ============================================================
setlocal
set KOK=C:\Users\yapra\Desktop\axcali
set TYLOG=%KOK%\raporlar\ty-cekim.log
set HBLOG=%KOK%\raporlar\hb-cekim.log
set N11LOG=%KOK%\raporlar\n11-cekim.log
set HAZLOG=%KOK%\raporlar\klon-tazele.log
set ISARET=%KOK%\raporlar\.kosum-suruyor

rem DEGISKEN KULLANILMAZ - blok icinde %VAR% AYRISTIRMA aninda okunur ve
rem HENUZ ATANMAMIS olur (gecikmeli genisletme tuzagi). Ilk yazimda tam bu
rem oldu: uyari dustu ama tarihi BOS cikti - "yarim kaldi" diyor, NE ZAMANDAN
rem BERI demiyordu. Isaret dosyasinin icerigi dogrudan loga dokuluyor.
if exist "%ISARET%" (
  echo !! ONCEKI KOSUM YARIM KALDI - baslangici asagida: >> %TYLOG%
  type "%ISARET%" >> %TYLOG%
  echo !! ONCEKI KOSUM YARIM KALDI - baslangici asagida: >> %HBLOG%
  type "%ISARET%" >> %HBLOG%
  echo !! ONCEKI KOSUM YARIM KALDI - baslangici asagida: >> %N11LOG%
  type "%ISARET%" >> %N11LOG%
)
echo %date% %time%> "%ISARET%"

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

del "%ISARET%" 2>nul
endlocal
