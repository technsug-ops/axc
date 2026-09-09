@echo off
rem Selliora GUNLUK YEDEK - OPERASYON KLONUNDAN kosar (K193).
rem Kurulum/kaldirma ve gerekce: BEKLEYENLER.md K193.
rem
rem ============================================================
rem  NIYE VAR - 21 GUNLUK PENCERE (09.09.2026)
rem ------------------------------------------------------------
rem  Vercel Blob kotasi (advanced ops 2000/2000) 30 EYLUL'de aciliyor.
rem  O gune kadar uretimdeki gece yedegi CALISMIYOR ve yedek almanin
rem  tek yolu operatorun makinesinde elle komut kosmak.
rem
rem  !! ELLE HATIRLAMAYA BIRAKMAK, ANAYASADAKI VAKANIN AYNISIDIR:
rem  17.08.2026'da son yedek 13.08'di ve DORT GUN kimse fark etmedi.
rem  "Sessiz yedeksizlik, para riskinin ta kendisidir."
rem  (Anayasa: "guvenlik mekanizmaya baglanir, insan disiplinine degil".)
rem
rem  ! HEDEF YEREL VE BU BILINCLI: Vercel'de kalici disk YOK, dolayisiyla
rem  uretim yolu icin YEDEK_HEDEFI=DOSYA bir cozum DEGIL (K119b'de neden
rem  yalanci yesil oldugu yazili). Ama OPERATORUN makinesinde disk gercek
rem  ve kalici - bu betik oraya yaziyor.
rem
rem  ! CEKIRDEK AYNI: canli:yedek-cekirdek, kullanicinin ekrandan bastigi
rem  dugmeyle AYNI gunluk-yedek govdesini (gunlukYedekYaz) kosar ve
rem  yazdigini GERI OKUR. Ayri bir yedek yolu acilsaydi ikisi sessizce
rem  ayrisirdi.
rem
rem  ! IZ BIRAKIR: govde basarida AuditLog'a YEDEK_ALINDI yaziyor. Uretimdeki
rem  can o izi okuyor ve "depodan dogrulanamadi ama iz var" diye AMBER
rem  yaniyor - 21 gun kirmizi yanip okunmaz hale gelmiyor (K49).
rem ============================================================
setlocal
set KOK=C:\Users\yapra\Desktop\axcali
set LOG=%KOK%\raporlar\gunluk-yedek.log
set HAZLOG=%KOK%\raporlar\klon-tazele.log

echo ============================================== >> %LOG%
echo BASLADI %date% %time% >> %LOG%

rem Klonu tazele - kod push'lanmis surumden kosar (K187 zinciri).
call %KOK%\scripts\klon-tazele.cmd "%HAZLOG%"
set HAZ=%errorlevel%
echo HAZIRLIK cikis=%HAZ% >> %LOG%

rem !! MUTLAK YOL VERILIR: betik KLONDAN kosuyor ve goreceli bir yol
rem klonun kendi klasorune duserdi - elle kosumlardan BASKA bir yere.
set YEDEK_KOK=%KOK%\veri\yedek-yerel
call npm run canli:yedek-cekirdek >> %LOG% 2>&1
set KOD=%errorlevel%
echo BITTI %date% %time% cikis=%KOD% >> %LOG%

rem !! CIKIS KODU YUTULMAZ: gorev gecmisinde kirmizi gorunmeli, yoksa
rem "kostu" ile "basardi" ayirt edilemez.
endlocal & exit /b %KOD%
