"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarRange, Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LISTE_PENCERELERI, type PencereTuru } from "@/lib/donem";
import { PENCERE_ANAHTARI } from "@/lib/pencere-etiket";
import { suzgecAdresi } from "@/lib/suzgec";

/**
 * ============================================================================
 *  ORTAK SÜZGEÇ ÇUBUĞU
 * ----------------------------------------------------------------------------
 *  Aynı işlem her ekranda AYNI görünür ve AYNI çalışır (İlke #10). Süzgeç
 *  ekran ekran yeniden yazılsaydı biri tarih aralığını, biri kanalı farklı
 *  yorumlardı.
 *
 *  TASARIM KARARLARI:
 *
 *  1. HER SEÇENEĞİN ALTINDA GERÇEK TARİH. "Son 15 gün" gün sayar, "Son 3 ay"
 *     takvim ayı sayar — ikisi aynı menüde. Kullanıcı tanımı tahmin etmek
 *     zorunda kalmasın diye seçili aralık her zaman yazılı durur.
 *
 *  2. KÜTÜPHANE YOK. 112 markalık aranabilir seçim için `cmdk`/`combobox`
 *     eklemek yerine mevcut Dialog + Input ile küçük bir seçici yazıldı —
 *     grafik kararının (12.08.2026) aynı gerekçesi: iki ekran uğruna
 *     bağımlılık ve güvenlik yüzeyi büyütmüyoruz.
 *
 *  3. MOBİLDE KATLANIR. Telefonda süzgeçler "Süzgeçler (2)" düğmesine
 *     katlanır; sayı kaç tanesinin açık olduğunu söyler. Dokunulan her
 *     öğe en az 44 px (İlke #8).
 *
 *  4. AKTİF SÜZGEÇ ROZETİ. Ne süzdüğün ekranda yazar ve tek tıkla kalkar —
 *     "neden 0 kayıt görüyorum" sorusunun cevabı hep görünür (İlke #5).
 * ============================================================================
 */

export type SuzgecSecenegi = { deger: string; etiket: string };

export type SuzgecTanimi = {
  /** URL parametresi — `kanal`, `marka`, `durum`… */
  ad: string;
  etiket: string;
  secenekler: SuzgecSecenegi[];
  /** Seçenek çoksa (marka: 112) düz liste yerine aranabilir seçici. */
  aranabilir?: boolean;
};

/** Seçenek sayısı bunu aşarsa düz açılır liste telefonda kullanılamaz. */
const ARAMA_ESIGI = 15;

export function SuzgecCubugu({
  temelAdres,
  mevcut,
  suzgecler,
  zaman,
}: {
  temelAdres: string;
  /** Sayfanın tüm searchParams'ı — dokunulmayanlar korunur. */
  mevcut: Record<string, string | undefined>;
  suzgecler: SuzgecTanimi[];
  /** Zaman süzgeci istemeyen ekranlar (Ürünler gibi) bunu vermez. */
  zaman?: {
    secili: PencereTuru | "";
    /** "01.06.2026 – 13.08.2026" — seçili aralığın gerçek karşılığı. */
    aralikMetni: string;
    baslangic: string;
    bitis: string;
  };
}) {
  const t = useTranslations("Suzgec");
  const tPencere = useTranslations("Pencere");
  const router = useRouter();

  const [acik, setAcik] = useState(false);
  const [ozelAcik, setOzelAcik] = useState(zaman?.secili === "OZEL");
  const [ozel, setOzel] = useState({
    baslangic: zaman?.baslangic ?? "",
    bitis: zaman?.bitis ?? "",
  });

  const git = (degisiklikler: Record<string, string | undefined>) => {
    router.push(suzgecAdresi(temelAdres, mevcut, degisiklikler));
  };

  const acikSuzgecler = suzgecler.filter(
    (s) => (mevcut[s.ad] ?? "").trim() !== "",
  );
  const zamanAcik = (zaman?.secili ?? "") !== "";
  const acikSayi = acikSuzgecler.length + (zamanAcik ? 1 : 0);

  const secenekEtiketi = (s: SuzgecTanimi) => {
    const deger = (mevcut[s.ad] ?? "").trim();
    return s.secenekler.find((o) => o.deger === deger)?.etiket ?? deger;
  };

  return (
    <div className="space-y-3">
      {/* --- TELEFON: katlanır düğme --- */}
      <Button
        variant="outline"
        className="h-11 w-full justify-between md:hidden"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4" />
          {t("suzgecler")}
        </span>
        {acikSayi > 0 ? <Badge variant="secondary">{acikSayi}</Badge> : null}
      </Button>

      <div className={`${acik ? "block" : "hidden"} space-y-3 md:block`}>
        {/* --- ZAMAN --- */}
        {zaman ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {LISTE_PENCERELERI.filter((p) => p !== "OZEL").map((p) => (
                <Button
                  key={p}
                  size="sm"
                  className="h-11 md:h-8"
                  variant={zaman.secili === p ? "default" : "outline"}
                  onClick={() => {
                    setOzelAcik(false);
                    git({ pencere: p, baslangic: "", bitis: "" });
                  }}
                >
                  {tPencere(PENCERE_ANAHTARI[p])}
                </Button>
              ))}
              <Button
                size="sm"
                className="h-11 md:h-8"
                variant={zaman.secili === "OZEL" ? "default" : "outline"}
                onClick={() => setOzelAcik((o) => !o)}
              >
                <CalendarRange />
                {tPencere("ozel")}
              </Button>
            </div>

            {/* Seçilen aralığın GERÇEK karşılığı — tanım tahmin edilmesin. */}
            {zaman.aralikMetni ? (
              <p className="text-muted-foreground text-xs">
                {zaman.aralikMetni}
              </p>
            ) : null}

            {ozelAcik ? (
              <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
                <div className="space-y-1">
                  <Label htmlFor="suzgec-bas">{t("baslangic")}</Label>
                  <Input
                    id="suzgec-bas"
                    type="date"
                    className="h-11 md:h-9"
                    value={ozel.baslangic}
                    onChange={(e) =>
                      setOzel((o) => ({ ...o, baslangic: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="suzgec-bit">{t("bitis")}</Label>
                  <Input
                    id="suzgec-bit"
                    type="date"
                    className="h-11 md:h-9"
                    value={ozel.bitis}
                    onChange={(e) =>
                      setOzel((o) => ({ ...o, bitis: e.target.value }))
                    }
                  />
                </div>
                <Button
                  className="h-11 md:h-9"
                  disabled={!ozel.baslangic || !ozel.bitis}
                  onClick={() =>
                    git({
                      pencere: "OZEL",
                      baslangic: ozel.baslangic,
                      bitis: ozel.bitis,
                    })
                  }
                >
                  {t("uygula")}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* --- SEÇİM SÜZGEÇLERİ --- */}
        <div className="flex flex-wrap gap-2">
          {suzgecler.map((s) =>
            s.aranabilir || s.secenekler.length > ARAMA_ESIGI ? (
              <AranabilirSecim
                key={s.ad}
                tanim={s}
                seciliDeger={(mevcut[s.ad] ?? "").trim()}
                seciliEtiket={secenekEtiketi(s)}
                onSec={(deger) => git({ [s.ad]: deger })}
              />
            ) : (
              <Select
                key={s.ad}
                value={(mevcut[s.ad] ?? "").trim() || "__TUMU__"}
                onValueChange={(d) =>
                  git({ [s.ad]: d === "__TUMU__" ? "" : d })
                }
              >
                <SelectTrigger
                  className="h-11 min-w-40 md:h-9"
                  aria-label={s.etiket}
                >
                  <SelectValue placeholder={s.etiket} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__TUMU__">
                    {t("tumu", { alan: s.etiket })}
                  </SelectItem>
                  {s.secenekler.map((o) => (
                    <SelectItem key={o.deger} value={o.deger}>
                      {o.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ),
          )}
        </div>

        {/* --- AKTİF SÜZGEÇ ROZETLERİ --- */}
        {acikSayi > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {zamanAcik && zaman ? (
              <Badge variant="secondary" className="gap-1">
                {tPencere(PENCERE_ANAHTARI[zaman.secili as PencereTuru])}
                <button
                  type="button"
                  aria-label={t("kaldir")}
                  className="hover:text-destructive"
                  onClick={() =>
                    git({ pencere: "", baslangic: "", bitis: "" })
                  }
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ) : null}

            {acikSuzgecler.map((s) => (
              <Badge key={s.ad} variant="secondary" className="gap-1">
                {s.etiket}: {secenekEtiketi(s)}
                <button
                  type="button"
                  aria-label={t("kaldir")}
                  className="hover:text-destructive"
                  onClick={() => git({ [s.ad]: "" })}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="h-11 md:h-8"
              onClick={() =>
                git(
                  Object.fromEntries([
                    ...suzgecler.map((s) => [s.ad, ""]),
                    ["pencere", ""],
                    ["baslangic", ""],
                    ["bitis", ""],
                  ]),
                )
              }
            >
              {t("temizle")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * ARANABİLİR SEÇİM — 112 marka düz açılır listeye sığmaz.
 *
 * Kütüphane yerine Dialog + Input: kullanıcı yazarak daraltır, listeden
 * seçer. Telefonda tam ekran açılır, her satır 44 px.
 */
function AranabilirSecim({
  tanim,
  seciliDeger,
  seciliEtiket,
  onSec,
}: {
  tanim: SuzgecTanimi;
  seciliDeger: string;
  seciliEtiket: string;
  onSec: (deger: string) => void;
}) {
  const t = useTranslations("Suzgec");
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState("");

  const kucuk = arama.trim().toLocaleLowerCase("tr");
  const suzulmus =
    kucuk === ""
      ? tanim.secenekler
      : tanim.secenekler.filter((o) =>
          o.etiket.toLocaleLowerCase("tr").includes(kucuk),
        );

  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 min-w-40 justify-start md:h-9">
          <Search className="size-4" />
          {seciliDeger ? seciliEtiket : tanim.etiket}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{tanim.etiket}</DialogTitle>
        </DialogHeader>

        <Input
          autoFocus
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder={t("araIpucu")}
          className="h-11 md:h-9"
        />

        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          <button
            type="button"
            className="hover:bg-muted flex h-11 w-full items-center rounded-md px-3 text-left text-sm"
            onClick={() => {
              onSec("");
              setAcik(false);
            }}
          >
            {t("tumu", { alan: tanim.etiket })}
          </button>

          {suzulmus.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t("sonucYok")}
            </p>
          ) : (
            suzulmus.map((o) => (
              <button
                key={o.deger}
                type="button"
                className={`hover:bg-muted flex h-11 w-full items-center rounded-md px-3 text-left text-sm ${
                  o.deger === seciliDeger ? "bg-muted font-medium" : ""
                }`}
                onClick={() => {
                  onSec(o.deger);
                  setAcik(false);
                }}
              >
                {o.etiket}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
