"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ScanLine } from "lucide-react";
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
 * OKUNAN BİÇİMLER — İKİ AYRI DÜNYA.
 *
 * ⚠ LİSTE ÜRÜN KODLARI İÇİN KURULMUŞTU VE KAPSAM GENİŞLEYİNCE GENİŞLEMEDİ.
 * İlk hâli `EAN13 · EAN8 · Code128 · QRCode` idi ve o gün ekran yalnız ÜRÜN
 * okuyordu. K41① ile **kargo etiketi** akışa girdi (`/okut`, `/paketle`) —
 * kargo etiketleri başka semboloji kullanır ve liste hiç güncellenmedi.
 *
 * Canlı bulgu 25.08.2026: Hepsiburada `hepsiJET` etiketi kamerayla
 * okunmuyor. Etiketteki numara **14 hane** (`62755096992291`) — bu klasik
 * bir `ITF-14` uzunluğu ve `ITF` listede YOKTU. Okuyucu tanımadığı bir
 * sembolojiyi "bulamadım" diye geçer; ekranda hata da çıkmaz, hiçbir şey
 * olmaz. Tam olarak kullanıcının anlattığı hâl.
 *
 * ⚠ HANGİ SEMBOLOJİ OLDUĞU ÖLÇÜLMEDİ — VE BU YAZILI. Etiketin gerçekte
 * `ITF` mi `Code128` mi olduğunu ölçemedim (elimde dosya olarak yok).
 * Bu yüzden TEK bir biçim eklenmedi: kargo etiketlerinde yaygın olan
 * ailenin tamamı açıldı. Genişletmenin bedeli yok (okuyucu zaten tarıyor),
 * dar bırakmanın bedeli okunmayan etiket.
 */
const URUN_FORMATLARI = ["EAN13", "EAN8", "Code128", "QRCode"] as const;

/** Kargo/lojistik etiketlerinde yaygın olanlar. */
const KARGO_FORMATLARI = ["ITF", "Code39", "Code93", "DataMatrix", "PDF417"] as const;

const DESTEKLENEN_FORMATLAR = [
  ...URUN_FORMATLARI,
  ...KARGO_FORMATLARI,
] as const;

/** Kamera karesini çözümler; kod bulursa metnini döner. */
async function kareyiCozumle(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
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
  const sonuclar = await readBarcodes(imageData, {
    formats: [...DESTEKLENEN_FORMATLAR],
    tryHarder: true,
    maxNumberOfSymbols: 4,
  });

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
}: {
  acik: boolean;
  onKapat: () => void;
  onOkundu: (kod: string) => void;
  baslik: string;
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

  useEffect(() => {
    if (!acik) return;

    let stream: MediaStream | null = null;
    let zamanlayici: ReturnType<typeof setInterval> | null = null;
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

      zamanlayici = setInterval(async () => {
        if (okumaSuruyor || iptal) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        okumaSuruyor = true;
        try {
          const kod = await kareyiCozumle(canvas, video);
          if (kod && !iptal) {
            onOkundu(kod);
            onKapat();
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
  }, [acik, onOkundu, onKapat, t]);

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

        <p className="text-muted-foreground text-xs">
          Desteklenen formatlar: EAN-13, EAN-8, Code128, QR
        </p>

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
}: {
  onOkundu: (kod: string) => void;
  baslik?: string;
  etiket?: string;
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
      />
    </>
  );
}
