"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Download, ScanLine } from "lucide-react";
import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ZOR_TARAMA_ARALIGI,
  tarayiciSecenekleri,
  zorKareMi,
} from "@/lib/barkod-formatlari";

/**
 * ============================================================================
 *  BARKOD / QR OKUMA
 * ----------------------------------------------------------------------------
 *  İki yol da destekleniyor, ikisi de aynı onOkundu geri çağrısına düşer:
 *
 *  1) USB BARKOD OKUYUCU (klavye emülasyonu)
 *     Okuyucu, okuduğu kodu klavyeden yazıyormuş gibi gönderir ve sonuna
 *     Enter ekler. Enter'ı yakalayıp formun gönderilmesini engelliyoruz;
 *     bunun yerine kodu işliyoruz. Böylece peş peşe okutma akıcı olur.
 *
 *  2) KAMERA (telefon/tablet)
 *     zxing-wasm — ZXing C++ motorunun WebAssembly derlemesi.
 *     Tarayıcının yerleşik BarcodeDetector API'si BİLEREK kullanılmadı:
 *     sadece Chrome/Android'de var, iOS Safari'de yok.
 *
 *  Manuel giriş her zaman açık kalır; okuyucu da kamera da yedeklidir.
 * ============================================================================
 */

// .wasm dosyası public/ altından servis ediliyor (scripts/copy-zxing-wasm.mjs).
// Varsayılan davranış jsDelivr CDN'inden çekmekti; internetsiz de çalışsın diye
// yerele aldık. Modül seviyesinde bir kez ayarlanır.
prepareZXingModule({
  overrides: { locateFile: () => "/zxing_reader.wasm" },
});

/**
 * OKUNAN BİÇİMLER — LİSTE ARTIK `lib/barkod-formatlari.ts`TE.
 *
 * ⚠ TAŞINDI (K111, 31.08.2026) ve sebebi bekçiydi: liste burada, modül
 * düzeyinde `prepareZXingModule` çağıran bir `.tsx` içinde durdukça bekçi onu
 * ÇAĞIRARAK ölçemiyor, KAYNAK TARAMAK zorunda kalıyordu. Aynı liste iki kez
 * eksik çıktı (25.08 `ITF`, 31.08 `UPCA`) ve ikisinde de kaynak tarayan bir
 * ölçüt yoktu. Saf modüle taşınınca bekçi gövdeyi çağırıp değerini ölçüyor.
 *
 * Gerekçeler, ölçümler ve perakende muafiyet listesi orada.
 */

/** Kamera karesini çözümler; kod bulursa metnini döner. */
async function kareyiCozumle(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  /**
   * ⛔ ZOR KARE — ard arda okuyamayan taramada ARADA BİR koşar.
   * Ölçüldü (01.09.2026): `tryHarder` kareyi 3–14× pahalılaştırıyor ve
   * 20 senaryonun 20'sinde SONUCU DEĞİŞTİRMİYOR. Ama ölçüm sentetik;
   * yeteneği tamamen atmak yerine seyrek bir emniyet olarak duruyor.
   */
  zor = false,
): Promise<string | null> {
  if (!video.videoWidth || !video.videoHeight) return null;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  /**
   * ⚠ TEK SEMBOL ARAMA KALDIRILDI. Kargo etiketinde BİRDEN ÇOK kod var
   * (hepsiJET örneği: üstte QR, altta çizgili barkod, yanda ikinci bir
   * kare kod). `maxNumberOfSymbols: 1` ile okuyucu HANGİSİNİ bulursa onu
   * döndürüyordu — ve QR çoğu kargo etiketinde takip numarası DEĞİL, bir
   * paket/adres demeti taşır. O değer arandığında hiçbir şey bulunmaz ve
   * kullanıcıya "okumadı" gibi görünür.
   */
  const sonuclar = await readBarcodes(imageData, tarayiciSecenekleri(zor));

  const gecerliler = sonuclar.filter((s) => s.isValid && s.text);
  if (gecerliler.length === 0) return null;

  /**
   * ⚠ ÇİZGİLİ (1B) KOD ÖNCELİKLİ — TAHMİN DEĞİL, ETİKET GERÇEĞİ.
   * Kargo etiketlerinde takip numarası çizgili barkotta yazar; kare kod
   * (QR/DataMatrix) genelde başka bir demet taşır. Ürün etiketlerinde ise
   * zaten tek kod olur ve bu tercih hiçbir şeyi değiştirmez.
   *
   * ⚠ RAF ETİKETİMİZDE İKİSİ AYNI DEĞERİ TAŞIYACAK (K50 EK-2), yani orada
   * da tercih zararsız — hangisi okunursa okunsun sonuç aynı.
   */
  const kareKodlar = new Set(["QRCode", "DataMatrix", "PDF417", "Aztec"]);
  const cizgili = gecerliler.find((s) => !kareKodlar.has(String(s.format)));
  return (cizgili ?? gecerliler[0]).text;
}

// ---------------------------------------------------------------------------
//  KAMERA DİYALOĞU
// ---------------------------------------------------------------------------

function KameraDiyalogu({
  acik,
  onKapat,
  onOkundu,
  baslik,
  surekli = false,
  onBosKare,
}: {
  acik: boolean;
  onKapat: () => void;
  onOkundu: (kod: string) => void;
  baslik: string;
  /**
   * SÜREKLİ KİP (K57, 28.08.2026) — okuma kamerayı KAPATMAZ.
   *
   * ⚠ VARSAYILAN `false`: bugünkü bütün kullanımlar (ürün ara, kargo etiketi
   * okut) "bir kod okut, işini gör" akışıdır ve orada kapanmak DOĞRU
   * davranıştır. Sayım kipi tek istisnadır.
   *
   * ⛔ NİYE GEREKTİ: sayımda 768 adet okutuluyor. Her okumada diyalog açılıp
   * kamera yeniden kurulsaydı (`getUserMedia` + `play()` + odak kısıtı,
   * tipik 0,5–2 sn) yalnız kamera açılışı 10–25 dakika ederdi — artı batarya.
   */
  surekli?: boolean;
  /**
   * KADRAJDA KOD YOK. Sürekli kipte her boş kare bildirilir; "boş kare
   * kilidi" bu sinyalden besleniyor (bkz. `lib/sayim/okuma.ts`).
   * ⚠ Kural BURADA DEĞİL: bu bileşen yalnız OLAYI bildirir, hükmü saf gövde
   * verir — yoksa kural sınanamaz bir yerde yaşardı.
   */
  onBosKare?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /**
   * ⚠ ÇÖZÜCÜ HATASI YALNIZ BİR KEZ GÖSTERİLİR. Saniyede dört kare düşüyor;
   * her karede uyarı basmak ekranı hata seliyle doldurur ve bilgi vermez.
   */
  const cozucuHatasi = useRef(false);
  const t = useTranslations("Kamera");
  const [hata, setHata] = useState<string | null>(null);
  const [hazir, setHazir] = useState(false);
  /**
   * ═══ TEŞHİS SATIRI (K113, 31.08.2026) ═══════════════════════════════
   *
   * ⛔ NİYE VAR: bir kargo barkodu okunmuyor ve ÜÇ hipotez ölçümle elendi
   * (biçim listesi · çözüm bütçesi · döngü kilidi). Geriye YAKALAMA YOLU
   * kaldı — ve orada teşhis TAVANA DAYANDI: kod `1920×1080` İSTİYOR ama
   * `ideal` olarak, yani cihaz `640×480` verse de uygulama bunu hiçbir
   * yerde SÖYLEMİYOR. Odak isteği de desteklenmiyorsa sessizce düşüyor.
   *
   * ⚠ SESSİZ DÜŞÜŞLER GÖRÜNÜR OLUYOR — davranış DEĞİŞMİYOR. Bu satır
   * hiçbir kısıtı değiştirmez, yalnız ne olduğunu söyler.
   * _(Anayasa: "sistem, kendi defterinde takip etmediği şey hakkında iddia
   * kurmaz" — ölçemediğimiz şeyi tahmin etmek yerine ölçüyoruz.)_
   *
   * ⚠ İKİ DEĞER AYRI GÖSTERİLİYOR ve bu bilinçli: `getSettings()` track'in
   * BEYANI, `videoWidth` ise gerçekten çizilen KARE. Ayrışırlarsa bu başlı
   * başına bir bulgudur — tek satıra indirseydik o ayrışma görünmezdi.
   */
  const [tani, setTani] = useState<string | null>(null);

  /**
   * ÇÖZÜCÜYE GİDEN KAREYİ OLDUĞU GİBİ İNDİR (K113 · yalnız teşhis).
   *
   * ⚠ AYRI CANVAS'A ÇİZİLİYOR, PAYLAŞILANA DEĞİL. Tarama döngüsü
   * `canvasRef`i 250 ms'de bir kullanıyor; araya girmek okumayı bozardı.
   * Teşhis aracı, teşhis ettiği şeyi etkilememeli.
   *
   * ⚠ ÖLÇEK YOK, YENİDEN SIKIŞTIRMA YOK: `video.videoWidth` boyutunda
   * çizilip PNG olarak veriliyor. Küçültülmüş ya da JPEG'lenmiş bir kare,
   * masaüstünde çözülemediğinde SEBEBİ karıştırırdı — kamera mı kötü,
   * kaydetme mi bozdu, ayırt edilemezdi.
   *
   * ⛔ ÜRETİM AKIŞINA DOKUNMAZ: hiçbir okuma tetiklemez, hiçbir durum
   * değiştirmez, kamerayı kapatmaz.
   */
  function kareyiKaydet() {
    const video = videoRef.current;
    if (!video?.videoWidth) return;

    const tuval = document.createElement("canvas");
    tuval.width = video.videoWidth;
    tuval.height = video.videoHeight;
    const ctx = tuval.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, tuval.width, tuval.height);

    const d = new Date();
    const ikiHane = (n: number) => String(n).padStart(2, "0");
    const ad =
      "kare-" +
      d.getFullYear() +
      ikiHane(d.getMonth() + 1) +
      ikiHane(d.getDate()) +
      "-" +
      ikiHane(d.getHours()) +
      ikiHane(d.getMinutes()) +
      ikiHane(d.getSeconds()) +
      ".png";

    tuval.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ad;
      a.click();
      /** ⚠ Nesne adresi bırakılmaz — her kayıtta bellekte bir kopya kalırdı. */
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  useEffect(() => {
    if (!acik) return;

    let stream: MediaStream | null = null;
    let zamanlayici: ReturnType<typeof setInterval> | null = null;
    /**
     * ⛔ ARD ARDA OKUNAMAYAN KARE SAYACI — zor taramanın tetiği.
     * Okuma başarılı olunca sıfırlanır; yoksa sayaç birikip her 8. karede
     * pahalı taramayı sonsuza kadar koşardı.
     */
    let ardArdaBasarisiz = 0;
    let iptal = false;
    let okumaSuruyor = false;

    async function baslat() {
      setHata(null);
      setHazir(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setHata(t("desteklenmiyor"));
        return;
      }

      try {
        /**
         * ⚠ ÇÖZÜNÜRLÜK İSTENİR — VE SEBEBİ ÖLÇÜLDÜ (25.08.2026).
         *
         * Önce yalnız `facingMode` isteniyordu; tarayıcı varsayılanı çoğu
         * cihazda **640×480**. Halil bildirdi: ürün barkodu okunuyor, KARGO
         * barkodu okunmuyor. Aradaki fark yoğunluk:
         *   · EAN-13 ürün barkodu ~95 modül → 640 pikselde modül başına ~6 px
         *   · 16 haneli kargo barkodu ~220 modül, üstelik A4'ün köşesinde
         *     → modül başına ~3 px, güvenilir çözümün altında
         * Yani kamera çalışıyordu; ÇÖZÜNÜRLÜK yetmiyordu.
         *
         * ⚠ `ideal` KULLANILIYOR, `min` DEĞİL. `min` verseydik desteklemeyen
         * cihaz `OverconstrainedError` atar ve kamera HİÇ açılmazdı — dar
         * çözünürlüklü bir okuma, hiç okumamaktan iyidir.
         */
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            // Telefonda arka kamera tercih edilir.
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        /**
         * ⚠ SÜREKLİ ODAK — İSTEĞE BAĞLI, DESTEKLEMEYEN CİHAZDA SESSİZ DÜŞER.
         * Kargo etiketi genelde masada duruyor ve telefon yaklaştırılıyor;
         * sabit odakta yakın mesafe bulanık kalır. Standart dışı bir kısıt
         * olduğu için `try` içinde: başarısız olursa akış aynen sürer.
         */
        try {
          const iz = stream.getVideoTracks()[0];
          /**
           * ⚠ `focusMode` TİPLERDE YOK — standart dışı ama yaygın desteklenen
           * bir kısıt. `unknown` üzerinden dönüştürülüyor; desteklemeyen
           * tarayıcı sessizce yok sayar ya da atar, ikisi de zararsız.
           */
          await iz?.applyConstraints({
            advanced: [{ focusMode: "continuous" }],
          } as unknown as MediaTrackConstraints);
        } catch {
          /* Odak kısıtı desteklenmiyor — kamera yine çalışır. */
        }
      } catch (e) {
        const ad = e instanceof Error ? e.name : "";
        if (ad === "NotAllowedError" || ad === "SecurityError") {
          setHata(t("izinYok"));
        } else if (ad === "NotFoundError" || ad === "OverconstrainedError") {
          setHata(t("bulunamadi"));
        } else {
          setHata(t("acilamadi"));
        }
        return;
      }

      if (iptal || !videoRef.current) return;

      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // Bazı tarayıcılar otomatik oynatmayı reddedebilir; kritik değil.
      }
      if (iptal) return;
      setHazir(true);

      /**
       * ⚠ BİR KEZ OKUNUR — ÇÖZÜM DÖNGÜSÜNÜN DIŞINDA. `getSettings()`i 250
       * ms'de bir çağırmak hem gereksiz iş hem de ölçtüğü şeyi bozma riski;
       * teşhis aracı, teşhis ettiği şeyi etkilememeli. Bekçi bu konumu
       * ölçüyor: döngünün içine kayarsa kırmızı yanar.
       */
      try {
        const iz = stream?.getVideoTracks()[0];
        const a = iz?.getSettings() as
          | { width?: number; height?: number; frameRate?: number; focusMode?: string }
          | undefined;
        const video = videoRef.current;
        const kare =
          video && video.videoWidth
            ? `${video.videoWidth}×${video.videoHeight}`
            : "?";
        /**
         * ⚠ `focusMode` AYARLARDA YOKSA "desteklenmiyor" YAZAR — boş
         * bırakmaz. Kısıt `catch {}` ile sessizce düşüyordu ve tam bu
         * sessizlik teşhisi tıkıyordu.
         */
        setTani(
          t("tani", {
            genislik: a?.width ?? 0,
            yukseklik: a?.height ?? 0,
            kare_hizi: Math.round(a?.frameRate ?? 0),
            odak: a?.focusMode ?? t("odakYok"),
            kare,
          }),
        );
      } catch {
        /** Teşhis okunamadıysa da SESSİZ KALMAZ — satır bunu söyler. */
        setTani(t("taniOkunamadi"));
      }

      zamanlayici = setInterval(async () => {
        if (okumaSuruyor || iptal) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        okumaSuruyor = true;
        try {
          /**
           * ⛔ HIZLI KARE ESAS, ZOR KARE EMNİYET. Ölçüldü (01.09.2026, koyu
           * dokulu zemin, 1920×1080): kod bulunmayan kare `tryHarder` ile
           * 668 ms, onsuz 146 ms. Döngü 250 ms'de bir tetikleniyor ama
           * önceki kare bitmeden yenisi başlamıyor — yani sistem barkoda
           * saniyede ~1,5 kez bakıyordu ve telefonda çok daha az.
           */
          const zor = zorKareMi(ardArdaBasarisiz);
          const kod = await kareyiCozumle(canvas, video, zor);
          if (iptal) return;
          /** ⚠ SAYAÇ OKUMADA SIFIRLANIR — yoksa zor tarama sürekli koşar. */
          ardArdaBasarisiz = kod ? 0 : ardArdaBasarisiz + 1;
          if (kod) {
            onOkundu(kod);
            /**
             * ⛔ SÜREKLİ KİPTE KAPANMAZ — sayaç artar, kamera açık kalır.
             * Tek kod okutan akışlarda eski davranış aynen sürüyor.
             */
            if (!surekli) onKapat();
          } else if (surekli) {
            /** Kadraj boş — kilidi açacak olay. Yalnız sürekli kipte anlamlı. */
            onBosKare?.();
          }
        } catch (e) {
          /**
           * ⚠ SESSİZ YUTMA KALDIRILDI (İlke #5 — sessiz başarısızlık yasak).
           *
           * Burada `catch {}` vardı ve HER KAREYİ sessizce yutuyordu. Çözücü
           * bir sebeple hiç çalışmasaydı (wasm yüklenmedi, biçim tanınmadı)
           * kamera açık kalır, hiçbir şey olmaz ve kullanıcı "okumuyor" der —
           * teşhis edilecek tek bir iz kalmazdı. Bugün tam bu yaşandı:
           * "kameralar barkodları okumuyor" bildirildi ve elimizde hiçbir
           * hata kaydı yoktu.
           *
           * ⚠ AMA HER KAREDE UYARI GÖSTERİLMEZ: saniyede dört kare düşüyor,
           * ekranı hata seliyle doldurmak da bilgi vermezdi. YALNIZ İLK hata
           * gösteriliyor — "bir şey ters gitti"yi söylemeye o yeter.
           */
          if (!iptal && !cozucuHatasi.current) {
            cozucuHatasi.current = true;
            const mesaj = e instanceof Error ? e.message : String(e);
            console.error("[barkod] çözücü hatası:", mesaj);
            setHata(t("cozucuHatasi", { sebep: mesaj.slice(0, 120) }));
          }
        } finally {
          okumaSuruyor = false;
        }
      }, 250);
    }

    void baslat();

    return () => {
      iptal = true;
      if (zamanlayici) clearInterval(zamanlayici);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [acik, onOkundu, onKapat, t, surekli, onBosKare]);

  return (
    <Dialog open={acik} onOpenChange={(a) => !a && onKapat()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{baslik}</DialogTitle>
          <DialogDescription>{t("yonerge")}</DialogDescription>
        </DialogHeader>

        {hata ? (
          <div
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
          >
            {hata}
          </div>
        ) : (
          <div className="bg-muted relative aspect-square w-full overflow-hidden rounded-md">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
            {/* Nişangâh */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="border-primary/70 h-1/3 w-4/5 rounded-md border-2" />
            </div>
            {!hazir ? (
              <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
                {t("aciliyor")}
              </div>
            ) : null}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/*
          ⚠ METİN AİLE DÜZEYİNDE VE SÖZLÜKTEN (K111). Eskiden koda gömülüydü
          ve "EAN-13, EAN-8, Code128, QR" diyordu — ITF eklendiğinde de,
          UPC-A eklendiğinde de güncellenmedi. Tek tek biçim saymak, listeyi
          her genişlettiğimizde SESSİZCE yalan söyleyen bir cümle bırakıyor
          (anayasa: "kolon başlığı bir iddiadır"). Aile düzeyinde yazılınca
          iddia dar kalıyor ve doğru kalıyor.
        */}
        <p className="text-muted-foreground text-xs">{t("desteklenenler")}</p>

        {/*
          ═══ TEŞHİS (K113) — DAVRANIŞ DEĞİŞTİRMEZ ═══════════════════════
          Küçük gri satır: kameranın FİİLEN verdiği çözünürlük, kare hızı,
          odak kipi ve çözücüye giden karenin boyutu. Sessiz düşüşler
          (istenen 1920, verilen 640) artık görünür.
        */}
        {tani ? (
          <p className="text-muted-foreground font-mono text-[11px]">{tani}</p>
        ) : null}

        {hazir && !hata ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-10"
            onClick={kareyiKaydet}
          >
            <Download />
            {t("kareyiKaydet")}
          </Button>
        ) : null}

        <Button type="button" variant="outline" onClick={onKapat}>
          Kapat
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
//  BARKOD GİRİŞ ALANI (USB okuyucu + kamera + manuel)
// ---------------------------------------------------------------------------

export function BarkodGirisi({
  value,
  onChange,
  onOkundu,
  id,
  placeholder,
  kameraBasligi = "Barkod / QR okut",
  autoFocus,
  className,
  inputRef,
  disabled = false,
}: {
  value: string;
  onChange: (deger: string) => void;
  /** Enter'a basıldığında ya da kamera okuduğunda çalışır. */
  onOkundu?: (kod: string) => void;
  id?: string;
  placeholder?: string;
  kameraBasligi?: string;
  autoFocus?: boolean;
  className?: string;
  /** Peş peşe okutmada kutuya tekrar odaklanabilmek için. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Kilitli alan: hem yazma hem kamera düğmesi kapanır. */
  disabled?: boolean;
}) {
  const [kameraAcik, setKameraAcik] = useState(false);

  const kameraKapat = useCallback(() => setKameraAcik(false), []);

  const kameradanGeldi = useCallback(
    (kod: string) => {
      onChange(kod);
      onOkundu?.(kod);
    },
    [onChange, onOkundu],
  );

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          id={id}
          ref={inputRef}
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // USB okuyucu kodun sonuna Enter gönderir. Formu göndermesini
            // engelleyip kodu işliyoruz.
            e.preventDefault();
            const kod = e.currentTarget.value.trim();
            if (kod) onOkundu?.(kod);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          title="Kamerayla okut"
          aria-label="Kamerayla okut"
          disabled={disabled}
          onClick={() => setKameraAcik(true)}
        >
          <Camera />
        </Button>
      </div>

      <KameraDiyalogu
        acik={kameraAcik}
        onKapat={kameraKapat}
        onOkundu={kameradanGeldi}
        baslik={kameraBasligi}
      />
    </div>
  );
}

/** Sadece kamera düğmesi gerektiğinde (giriş kutusu ayrı yönetiliyorsa). */
export function KameraDugmesi({
  onOkundu,
  baslik = "Barkod / QR okut",
  etiket = "Kamerayla okut",
  surekli = false,
  onBosKare,
}: {
  onOkundu: (kod: string) => void;
  baslik?: string;
  etiket?: string;
  /** Sürekli kip — bkz. `KameraDiyalogu`. Varsayılan KAPALI. */
  surekli?: boolean;
  onBosKare?: () => void;
}) {
  const [acik, setAcik] = useState(false);
  const kapat = useCallback(() => setAcik(false), []);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setAcik(true)}>
        <ScanLine />
        {etiket}
      </Button>
      <KameraDiyalogu
        acik={acik}
        onKapat={kapat}
        onOkundu={onOkundu}
        baslik={baslik}
        surekli={surekli}
        onBosKare={onBosKare}
      />
    </>
  );
}
