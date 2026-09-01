<#
================================================================================
  GECE KANAL KARŞILAŞTIRMASI — Windows Görev Zamanlayıcı (K121, 01.09.2026)
--------------------------------------------------------------------------------
  Trendyol'daki ürün listesini OKUR ve defterdeki listeleme durumunu tazeler.
  Panel kutusu ("Rafta var, vitrinde yok") bu koşumdan besleniyor.

  ⛔ PAZARYERİNE HİÇBİR ŞEY YAZILMAZ — yalnız okunur. Stok senkronu kapsam
  dışı (kullanıcı şartı 01.09.2026).

  ── ⛔ NİYE SUNUCUDA DEĞİL, BU MAKİNEDE ────────────────────────────────
  TY API anahtarı `.env.canli` dosyasında yaşıyor ve o dosya Vercel'e
  ÇIKMIYOR. İstemci de bilerek `scripts/` altında duruyor — "modülü uygulama
  katmanına koymak, uygulamanın onu çağırabileceğini İMA eder" (A3 güvenlik
  çerçevesi). Cron'u sunucuya taşımak o kararı çevirmek demek; çevrilmedi.
  Açılış şartı panoda: ikinci firma kaydı + gizli-anahtar yönetimi.

  ── ⚠ ÇIKTI VE ÇIKIŞ KODU DOSYAYA YAZILIR ─────────────────────────────
  Görev Zamanlayıcı kendi penceresini kapatır; ekrana basılan hiçbir şey
  ertesi sabah okunamaz. Bu yüzden hem çıktı hem çıkış kodu diske yazılıyor.
  ⛔ VE ÇIKIŞ KODU AYRI DOSYAYA: "koştu mu" ile "başardı mı" ayrı sorular.
  _(Anayasa: hiçbir doğrulama boru sonuna güvenmez.)_

  ── ⚠ KOŞUM İZİ AYRICA DEFTERE DÜŞER ──────────────────────────────────
  Betik her koşumda `AuditLog`a `KANAL_KARSILASTIRMA` yazıyor. Panel kutusu
  onu okuyup "son koşum BAŞARISIZ" diyebiliyor — yoksa düşmüş bir koşumdan
  sonra kutu "48 saat oldu" der ve yanlış teşhise götürürdü.
================================================================================

  KURULUM — ÜÇ ADIM (Halil):

    1) Başlat → "Görev Zamanlayıcı" → Görev Oluştur
    2) Tetikleyici: Günlük, 03:00.  Eylem: Program başlat
         Program : powershell.exe
         Bağımsız değişkenler:
           -ExecutionPolicy Bypass -File "C:\Users\yapra\Desktop\axcali\scripts\gece-kanal-karsilastirma.ps1"
    3) "En yüksek ayrıcalıklarla çalıştır" İŞARETLİ, "Kullanıcı oturum
       açmamış olsa da çalıştır" İŞARETLİ.

  ⚠ ERTESİ SABAH KONTROL:  veri\gunluk\kanal-karsilastirma-son.txt
     İlk satırda çıkış kodu yazar; `0` başarı, başka her şey hata.
#>

$ErrorActionPreference = "Continue"

# ⚠ DEPO KÖKÜ BETİĞİN KENDİ YERİNDEN BULUNUR — sabit yol gömülmez;
#    depo taşınırsa görev sessizce boş klasörde koşmasın.
$Kok = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Kok

$Klasor = Join-Path $Kok "veri\gunluk"
if (-not (Test-Path $Klasor)) { New-Item -ItemType Directory -Path $Klasor | Out-Null }

$Damga  = Get-Date -Format "yyyy-MM-dd_HHmm"
$Gunluk = Join-Path $Klasor "kanal-karsilastirma-$Damga.log"
$Son    = Join-Path $Klasor "kanal-karsilastirma-son.txt"

"=== KANAL KARŞILAŞTIRMASI · $(Get-Date -Format 'dd.MM.yyyy HH:mm:ss') ===" |
    Out-File -FilePath $Gunluk -Encoding utf8

# ⛔ ÇIKTI YUTULMAZ: stderr de dosyaya gider (2>&1). Sessiz bir hata,
#    ertesi sabah "koştu sanılan" bir koşum üretirdi.
& npm run canli:kanal-listeleme -- --yaz *>&1 |
    Out-File -FilePath $Gunluk -Encoding utf8 -Append
$Kod = $LASTEXITCODE

# ⛔ ÇIKIŞ KODU ÖNCE YAZILIR ve TEK BAŞINA OKUNABİLİR olur — ilk satırda.
@(
    "cikis_kodu=$Kod"
    "an=$(Get-Date -Format 'dd.MM.yyyy HH:mm:ss')"
    "gunluk=$Gunluk"
    $(if ($Kod -eq 0) { "durum=BASARILI" } else { "durum=BASARISIZ" })
) | Out-File -FilePath $Son -Encoding utf8

# ⚠ ESKİ GÜNLÜKLER 30 GÜN SONRA SİLİNİR — disk şişmesin, ama son ay
#   elde kalsın (bir arıza genelde ertesi gün değil, hafta sonra sorulur).
Get-ChildItem -Path $Klasor -Filter "kanal-karsilastirma-*.log" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

exit $Kod
