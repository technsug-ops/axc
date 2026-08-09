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

const DESTEKLENEN_FORMATLAR = ["EAN13", "EAN8", "Code128", "QRCode"] as const;

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

  const sonuclar = await readBarcodes(imageData, {
    formats: [...DESTEKLENEN_FORMATLAR],
    tryHarder: true,
    maxNumberOfSymbols: 1,
  });

  const gecerli = sonuclar.find((s) => s.isValid && s.text);
  return gecerli?.text ?? null;
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
        stream = await navigator.mediaDevices.getUserMedia({
          // Telefonda arka kamera tercih edilir.
          video: { facingMode: "environment" },
          audio: false,
        });
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
        } catch {
          // Tek bir karenin çözümlenememesi normal; sessiz geç.
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
