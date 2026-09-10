@echo off
rem Selliora KANAL cekimi (SIK) - OPERASYON KLONUNDAN kosar (K162-3).
rem Klon = GitHub'a push'lanmis (bekciden gecmis) kod; gelistirme
rem agacindaki tur/mutasyon pencereleri cekimi ETKILEMEZ.
rem Yoruma KOMUT yazilmaz (K158). Kurulum/kaldirma: BEKLEYENLER.md K162.
rem
rem ============================================================
rem  ROL DEGISTI 10.09.2026 - ARTIK BIRINCIL DEGIL, YEDEK
rem ------------------------------------------------------------
rem  Kullanici sordu: "cekim neden bilgisayarima bagimli". Birincil
rem  simdi cron-job.org (ucuncu taraf, dakika hassasiyetinde, hem
rem  bu bilgisayardan hem GitHub Actions'in kendi zamanlama sinirindan
rem  BAGIMSIZ) - Vercel uclarini dogrudan cagirir.
rem
rem  BU GOREV KALDIRILMADI, SEYREKLESTIRILDI: 5 dk -> 1 SAAT (kullanici
rem  karari, secenek "2"). Bilgisayar zaten acikken bedava bir yedeklilik
rem  sagliyor ama artik kritik degil; cakisan siparis ATLANIR (ezme yok),
rem  uc kaynagin (cron-job.org + GitHub Actions + bu gorev) ayni anda
rem  calismasi zararsiz.
rem
rem  Windows Gorev Zamanlayici'da degistirildi (schtasks/Set-ScheduledTask
rem  ile, bu dosyaya DOKUNMADAN - araliği gorev tanimi tutuyor, bu betik
rem  degil). Asagidaki "5 dakikalik araliga siginiyor" olcumleri ARTIK
rem  GECERLI DEGIL (o gunku dogru bilgiydi, silinmedi): sure siniri hala
rem  gecerli cunku tek kosumun suresi degismedi, sadece kosumlar arasi
rem  bosluk 5 dk'dan 1 saate cikti.
rem ============================================================
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
rem
rem ============================================================
rem  BU DOSYA PUSH KAPISININ DISINDA - BILINCLI (mimar karari 08.09.2026)
rem ------------------------------------------------------------
rem  OLCULDU 08.09: gorev bu dosyayi GELISTIRME agacindan okuyor, yani
rem  buraya yazilan bir duzeltme bekci turundan GECMEDEN uretime girer.
rem  Ayni gece kanitlandi: olum-adimi isareti yazildigi anda 22:02'deki
rem  zamanlanmis kosum onu kullandi.
rem
rem  ! CEKIM KODU BU KAPIYI ATLAMIYOR. klon-tazele.cmd klona "cd /d"
rem  yapiyor ve setlocal tasimadigi icin dizin kosumun geri kalaninda
rem  gecerli kaliyor: uc "npm run canli:*" cagrisi da KLONDAN kosar ve
rem  klon yalniz push'lanmis (bekciden gecmis) kodu ceker. Atlayan tek
rem  sey bu orkestrasyon betigi.
rem
rem  ! ONCE YANLIS RAPORLANDI: Get-ScheduledTask ciktisindaki cmd
rem  yolu "cekimin kostugu agac" diye okundu. Ikisi ayri sey; fark
rem  olculunce duzeltildi (BEKLEYENLER K191 duzeltmesi). Kayit silinmedi.
rem
rem  KARAR - KAPI KONULMADI: bu bir orkestrasyon betigi, deploy
rem  EDILMIYOR ve canli cekim surekliligi icin ANINDA duzeltilebilir
rem  olmali. Push kapisi 15 dakikalik bekci turu dayatir ve 5 dakikalik
rem  cekim ritmiyle celisir - arizanin ortasinda 15 dakika beklemek,
rem  kapinin onledigi riskten buyuk bir risktir.
rem
rem  KORUMA PUSH DEGIL GOZLEM - UC YOL, UCU DE 08.09'da kuruldu:
rem    1) ESIK        cekim yasi 4 x periyot (20 dk) - K189
rem    2) YARIM KOSUM isaret dosyasi: kosum bitmediyse sonraki soyler
rem    3) OLUM ADIMI  .son-adim: NEREDE oldugu ve cikis kodu
rem  Bu betikteki bir hata sessiz kalamaz; ucu birden gorunur kilar.
rem
rem  !! BU BIR MUAFIYET DEGIL, BEYANDIR. Kapinin yoklugu unutulmus
rem  degil, TARTILMIS bir karardir - ve bedeli (gozleme bagimlilik)
rem  burada yazilidir. Gozlem uclusunden biri kaldirilirsa bu karar
rem  YENIDEN tartilir.
rem  (Anayasa: "beyan edilmemis her kullanim hata sayilir" ve
rem  "kapatma karari da panoya yazilir - gerekcesiyle".)
rem ============================================================
rem
rem ============================================================
rem  OLUM SEBEBI ISARETI - "YARIM KALDI" YETMEZ, "NEREDE" GEREK (K191)
rem ------------------------------------------------------------
rem  VAKA 08.09.2026 aksam: bes kosum ust uste basladi ve BITMEDI
rem  (20:42 - 21:02 yerel). Yarim kosum isareti her seferinde dustu ve
rem  isini yapti - ama yalnizca "yarim kaldi" diyebildi. NEREDE oldugu
rem  hicbir yerde yazmiyordu ve teshis tam orada tavana dayandi.
rem
rem  ! SAG KALAN YANLILIGI: sure olcumu yalniz TAMAMLANAN kosumlari
rem  gorur (n=129, ortanca 15 sn, tavan 240 sn - uzak). Olen kosumlarin
rem  bitis damgasi hic yazilmadigi icin o olcume YAPISI GEREGI
rem  giremiyorlar. Yani "kosumlar tavana uzak" dogru ama olenler
rem  hakkinda hicbir sey soylemiyor.
rem
rem  CARE: her adimdan ONCE .son-adim dosyasi guncellenir. Kosum
rem  BITTI-SIK basmadan olurse, bir sonraki kosum o dosyayi okur ve
rem  UC LOGA DA "OLDUGU ADIM" diye dokuor. Cikis kodu da yakalanir
rem  (TYKOD/HBKOD/N11KOD) - errorlevel bir sonraki echo ile
rem  tazelendigi icin degiskene alinmadan iki yerde kullanilamaz.
rem
rem  !! SEBEP HALA BILINMIYOR VE UYDURULMAZ. Bekci turu / veritabani
rem  baglanti siniri birer HIPOTEZDIR, kanit degil. Ilk gercek olumde
rem  son-adim isareti yeri gosterecek; hukum O ZAMAN kurulur.
rem  (Anayasa: "sistem, kendi defterinde takip etmedigi sey hakkinda
rem  iddia kurmaz" ve "yanlis emsale dayanan gerekce karari yeniden
rem  actirir".)
rem ============================================================
setlocal
set KOK=C:\Users\yapra\Desktop\axcali
set TYLOG=%KOK%\raporlar\ty-cekim.log
set HBLOG=%KOK%\raporlar\hb-cekim.log
set N11LOG=%KOK%\raporlar\n11-cekim.log
set HAZLOG=%KOK%\raporlar\klon-tazele.log
set ISARET=%KOK%\raporlar\.kosum-suruyor
set ADIM=%KOK%\raporlar\.son-adim

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
  echo !! OLDUGU ADIM: >> %TYLOG%
  type "%ADIM%" >> %TYLOG% 2>nul
  echo !! OLDUGU ADIM: >> %HBLOG%
  type "%ADIM%" >> %HBLOG% 2>nul
  echo !! OLDUGU ADIM: >> %N11LOG%
  type "%ADIM%" >> %N11LOG% 2>nul
)
echo %date% %time%> "%ISARET%"

echo ADIM=HAZIRLIK %date% %time%> "%ADIM%"
echo ============================================== >> %HAZLOG%
echo HAZIRLIK %date% %time% >> %HAZLOG%
call %KOK%\scripts\klon-tazele.cmd "%HAZLOG%"
set HAZ=%errorlevel%
echo HAZIRLIK-BITTI cikis=%HAZ% >> %HAZLOG%

echo ============================================== >> %TYLOG%
echo BASLADI-SIK %date% %time% hazirlik=%HAZ% >> %TYLOG%
echo ADIM=CEKIM-TY %date% %time%> "%ADIM%"
call npm run canli:ty-ice-aktar -- --gun=3 --yaz >> %TYLOG% 2>&1
set TYKOD=%errorlevel%
echo BITTI-SIK %date% %time% cikis=%TYKOD% >> %TYLOG%
echo ADIM=TY-BITTI cikis=%TYKOD% %date% %time%> "%ADIM%"

echo ============================================== >> %HBLOG%
echo BASLADI-SIK %date% %time% hazirlik=%HAZ% >> %HBLOG%
echo ADIM=CEKIM-HB %date% %time%> "%ADIM%"
call npm run canli:hb-ice-aktar -- --yaz >> %HBLOG% 2>&1
set HBKOD=%errorlevel%
echo BITTI-SIK %date% %time% cikis=%HBKOD% >> %HBLOG%
echo ADIM=HB-BITTI cikis=%HBKOD% %date% %time%> "%ADIM%"

echo ============================================== >> %N11LOG%
echo BASLADI-SIK %date% %time% hazirlik=%HAZ% >> %N11LOG%
echo ADIM=CEKIM-N11 %date% %time%> "%ADIM%"
call npm run canli:n11-ice-aktar -- --yaz >> %N11LOG% 2>&1
set N11KOD=%errorlevel%
echo BITTI-SIK %date% %time% cikis=%N11KOD% >> %N11LOG%
echo ADIM=BITTI %date% %time%> "%ADIM%"

del "%ISARET%" 2>nul
endlocal
