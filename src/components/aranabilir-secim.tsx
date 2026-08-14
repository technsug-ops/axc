"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * ============================================================================
 *  ARANABİLİR SEÇİM — UZUN LİSTELER İÇİN TEK BİLEŞEN
 * ----------------------------------------------------------------------------
 *  NEDEN VAR: sistemde 1055 ürün var. Düz açılır listede (`Select`) 500 satır
 *  göstermek telefonda kullanılamaz — 14.08.2026'da kullanıcı tam bunu
 *  yaşadı: "değişim için ürün seç kısmında BÜTÜN ÜRÜNLER yazılı, oradan
 *  rastgele seçtim."
 *
 *  Süzgeç çubuğunda aynı bileşen zaten vardı ama İÇİNE GÖMÜLÜYDÜ ve yalnız
 *  URL'e yazan bir seçim yapıyordu; form alanı olarak kullanılamıyordu.
 *  Buraya çıkarıldı, iki yer de aynı bileşeni kullanıyor (İlke #10):
 *  aynı işlem her ekranda AYNI görünür ve AYNI çalışır.
 *
 *  Kütüphane eklenmedi (`cmdk`/combobox): mevcut Dialog + Input yetiyor.
 *  Aynı gerekçe grafik ve süzgeç kararlarında da geçerliydi — iki ekran
 *  uğruna bağımlılık ve güvenlik yüzeyi büyütmüyoruz.
 * ============================================================================
 */

export type AranabilirSecenek = {
  deger: string;
  etiket: string;
  /** Etiketin altında duran ikincil satır — stok adedi, SKU vb. */
  altEtiket?: string;
};

export function AranabilirSecim({
  etiket,
  secenekler,
  seciliDeger,
  onSec,
  /** Verilirse listenin başında "tümü/temizle" satırı çıkar. */
  tumuEtiketi,
  /**
   * Seçim BOŞKEN düğmede yazan metin. Verilmezse `etiket` kullanılır.
   * Boşluğun kendisi anlamlı olan alanlar için: "Değişim yok" bir yer tutucu
   * değil, geçerli bir cevaptır — orada alan adını göstermek bilgi kaybıdır.
   */
  bosEtiket,
  /** Düğmenin id'si — `<Label htmlFor>` ile eşleşsin. */
  id,
  className,
}: {
  etiket: string;
  secenekler: AranabilirSecenek[];
  seciliDeger: string;
  onSec: (deger: string) => void;
  tumuEtiketi?: string;
  bosEtiket?: string;
  id?: string;
  className?: string;
}) {
  const t = useTranslations("Suzgec");
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState("");

  const kucuk = arama.trim().toLocaleLowerCase("tr");
  const suzulmus =
    kucuk === ""
      ? secenekler
      : secenekler.filter(
          (o) =>
            o.etiket.toLocaleLowerCase("tr").includes(kucuk) ||
            (o.altEtiket ?? "").toLocaleLowerCase("tr").includes(kucuk),
        );

  const secili = secenekler.find((o) => o.deger === seciliDeger);

  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={`h-11 w-full justify-start md:h-9 ${className ?? ""}`}
        >
          <Search className="size-4 shrink-0" />
          {/* Seçili değer varsa O yazar; yoksa alanın adı yer tutucu olur.
              Yer tutucu değer gibi görünmesin diye seçili metin normal,
              boş hâl soluk (İlke #11). */}
          <span className={`truncate ${secili ? "" : "text-muted-foreground"}`}>
            {secili ? secili.etiket : (bosEtiket ?? etiket)}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{etiket}</DialogTitle>
        </DialogHeader>

        <Input
          autoFocus
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder={t("araIpucu")}
          className="h-11 md:h-9"
        />

        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {tumuEtiketi ? (
            <button
              type="button"
              className="hover:bg-muted flex h-11 w-full items-center rounded-md px-3 text-left text-sm"
              onClick={() => {
                onSec("");
                setAcik(false);
              }}
            >
              {tumuEtiketi}
            </button>
          ) : null}

          {suzulmus.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t("sonucYok")}
            </p>
          ) : (
            suzulmus.map((o) => (
              <button
                key={o.deger}
                type="button"
                className={`hover:bg-muted flex min-h-11 w-full flex-col justify-center rounded-md px-3 py-1.5 text-left text-sm ${
                  o.deger === seciliDeger ? "bg-muted font-medium" : ""
                }`}
                onClick={() => {
                  onSec(o.deger);
                  setAcik(false);
                }}
              >
                <span className="truncate">{o.etiket}</span>
                {o.altEtiket ? (
                  <span className="text-muted-foreground text-xs">
                    {o.altEtiket}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
