@echo off
rem Selliora YEREL YEDEK - OPERASYON KLONUNDAN kosar (kanal-sik-cekim.cmd
rem ile ayni desen - K162-3).
rem
rem ============================================================
rem  NIYE VAR - 10.09.2026, Vercel Blob deposu askiya alindi
rem ------------------------------------------------------------
rem  Hem otomatik (/api/yedek/otomatik) hem elle (Simdi Yedek Al dugmesi)
rem  yedek YOLU AYNI Blob deposuna yaziyor (gunlukYedekYaz() - K206,
rem  BEKLEYENLER.md). Depo askidayken IKISI DE calismiyor.
rem
rem  Bu gorev "hem yerel hem Blob'a alalim" karariyla acildi: Blob
rem  duzelene kadar TEK gercek guvence bu. canli-yedek-dosya.ts salt
rem  OKUR (canliya yazmaz), yerel diske yazar VE geri okuyup dogrular
rem  (boyut + JSON.parse + kayit sayilari + rastgele 5 kayit alan alan).
rem  Bu script o dogrulamayi GECMEZSE de calismaya devam eder - amac
rem  "bir yedek dosyasi olustu" degil "dogrulanan bir yedek olustu"dur;
rem  cikis kodu bunu tasir.
rem
rem  ⚠ BLOB DUZELINCE BU GOREV KALDIRILMAZ - iki hedef birden tutmak
rem  (yerel + uzak) tek nokta arizasini onler. K206 kapaninca bu notun
rem  ustune "Blob da dogrulandi, tarih X" eklenir.
rem ============================================================
setlocal
set KOK=C:\Users\yapra\Desktop\axcali
set LOG=%KOK%\raporlar\yerel-yedek.log
set HAZLOG=%KOK%\raporlar\klon-tazele.log

echo ============================================== >> %LOG%
echo BASLADI %date% %time% >> %LOG%
call %KOK%\scripts\klon-tazele.cmd "%HAZLOG%"
set HAZ=%errorlevel%
echo hazirlik=%HAZ% >> %LOG%

cd /d C:\Users\yapra\Desktop\axcali-operasyon
call npm run canli:yedek-dosya >> %LOG% 2>&1
set KOD=%errorlevel%
echo BITTI %date% %time% cikis=%KOD% >> %LOG%
endlocal
