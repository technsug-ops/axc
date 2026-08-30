"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import {
  raftakiUrunler,
  rafiSec,
  tasimayiUygula,
  type RafUrunu,
  type SeciliRaf,
} from "@/app/yerlestir/actions";
import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import { tasimaKarari } from "@/lib/depo/tasima";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  TOPLU RAF TAŞIMA — EKRAN (K50 ⑥)
 * ----------------------------------------------------------------------------
 *  Kaynak rafı okut → hedef rafı okut → "N ürün taşınacak" → ONAYLA.
 *
 *  ⚠ ONAYSIZ YAZMA YOK. Kaç ürünün nereye gideceği GÖRÜLMEDEN hiçbir şey
 *  yazılmaz — ve ekran kısmî mi tam mı olduğunu da söyler.
 *
 *  ⚠ OKUNAN DEĞER PARAMETRE OLARAK GEÇER, DURUMDAN OKUNMAZ.
 *
 *  ⚠ KARAR SAF GÖVDEDEN (`tasimaKarari`) — ekran onu ÇAĞIRIR. Aynı kural
 *  sunucuda da çağrılıyor; iki yerde iki kural olsaydı ekran "12 taşınacak"
 *  der, sunucu 11 taşırdı.
 * ============================================================================
 */
export function Tasiyici() {
  const t = useTranslations("Tasi");

  const kaynakKutusu = useRef<HTMLInputElement>(null);
  const hedefKutusu = useRef<HTMLInputElement>(null);

  const [kaynakKodu, setKaynakKodu] = useState("");
  const [hedefKodu, setHedefKodu] = useState("");
  const [kaynak, setKaynak] = useState<SeciliRaf | null>(null);
  const [hedef, setHedef] = useState<SeciliRaf | null>(null);
  const [urunler, setUrunler] = useState<RafUrunu[]>([]);
  const [secili, setSecili] = useState<string[]>([]);
  const [not, setNot] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  /** ⭐ EKRANIN HÜKMÜ SAF GÖVDEDEN — burada kural yazılmıyor. */
  const karar = tasimaKarari({
    kaynakId: kaynak?.id ?? null,
    hedefId: hedef?.id ?? null,
    kaynaktakiler: urunler.map((u) => u.variantId),
    secili,
  });

  const rafOku = (yon: "kaynak" | "hedef", okunan?: string) => {
    const aranacak = (okunan ?? (yon === "kaynak" ? kaynakKodu : hedefKodu)).trim();
    if (!aranacak) return;
    setSonuc(null);
    basla(async () => {
      const cevap = await rafiSec(aranacak);
      if (cevap.durum !== "RAF") {
        setNot(
          cevap.durum === "PASIF"
            ? t("rafPasif", { kod: cevap.kod })
            : t("rafYok", { kod: cevap.kod }),
        );
        return;
      }
      setNot(null);
      if (yon === "kaynak") {
        setKaynak(cevap.raf);
        setKaynakKodu(cevap.raf.kod);
        /** ⭐ SEÇİM VARSAYILAN OLARAK TAMAMI — kısmî taşıma İSTİSNA. */
        const liste = await raftakiUrunler(cevap.raf.id);
        setUrunler(liste);
        setSecili(liste.map((u) => u.variantId));
        hedefKutusu.current?.focus();
        return;
      }
      setHedef(cevap.raf);
      setHedefKodu(cevap.raf.kod);
    });
  };

  const degistir = (variantId: string) => {
    setSonuc(null);
    setSecili((o) =>
      o.includes(variantId) ? o.filter((x) => x !== variantId) : [...o, variantId],
    );
  };

  const uygula = () => {
    if (karar.tur !== "HAZIR") return;
    /**
     * ⚠ KİMLİKLER ÇAĞRI ÖNCESİ YAKALANIR — durum güncellenmiş olsun diye
     * beklenmiyor.
     */
    const kaynakId = kaynak?.id ?? null;
    const hedefId = hedef?.id ?? null;
    const liste = [...secili];
    basla(async () => {
      const cevap = await tasimayiUygula(kaynakId, hedefId, liste);
      if (cevap.durum !== "TASINDI") {
        setNot(t(`durum${cevap.durum}` as "durumAYNI_RAF"));
        return;
      }
      setNot(null);
      setSonuc(
        t("tasindi", {
          adet: cevap.adet,
          kaynak: cevap.kaynakKod,
          hedef: cevap.hedefKod,
        }),
      );
      /** ⚠ KAYNAK TAZELENİR: taşınanlar artık orada değil. */
      const kalan = kaynakId ? await raftakiUrunler(kaynakId) : [];
      setUrunler(kalan);
      setSecili(kalan.map((u) => u.variantId));
      setKaynak((r) => (r ? { ...r, urunSayisi: kalan.length } : r));
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* ═══ KAYNAK VE HEDEF ════════════════════════════════════════════ */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="kaynak-kutusu" className="text-sm font-medium">
            {t("kaynakAdimi")}
          </label>
          <BarkodGirisi
            id="kaynak-kutusu"
            value={kaynakKodu}
            onChange={setKaynakKodu}
            onOkundu={(k) => rafOku("kaynak", k)}
            inputRef={kaynakKutusu}
            placeholder={t("rafYerTutucu")}
            kameraBasligi={t("kaynakAdimi")}
            autoFocus
            disabled={bekliyor}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => rafOku("kaynak")}
            disabled={bekliyor}
            className="h-11 w-full"
          >
            {t("rafSec")}
          </Button>
          {kaynak ? (
            <p className="text-muted-foreground text-xs">
              {t("rafDoluluk", { adet: kaynak.urunSayisi })}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="hedef-kutusu" className="text-sm font-medium">
            {t("hedefAdimi")}
          </label>
          <BarkodGirisi
            id="hedef-kutusu"
            value={hedefKodu}
            onChange={setHedefKodu}
            onOkundu={(k) => rafOku("hedef", k)}
            inputRef={hedefKutusu}
            placeholder={t("rafYerTutucu")}
            kameraBasligi={t("hedefAdimi")}
            disabled={bekliyor}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => rafOku("hedef")}
            disabled={bekliyor}
            className="h-11 w-full"
          >
            {t("rafSec")}
          </Button>
          {hedef ? (
            <p className="text-muted-foreground text-xs">
              {t("rafDoluluk", { adet: hedef.urunSayisi })}
            </p>
          ) : null}
        </div>
      </section>

      {not ? <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{not}</p> : null}
      {sonuc ? (
        <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumlu}`} role="status">
          {sonuc}
        </p>
      ) : null}

      {/* ═══ SEÇİM — KISMÎ TAŞIMA ═══════════════════════════════════════ */}
      {urunler.length > 0 ? (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium">
              {t("secimBasligi", { secili: secili.length, toplam: urunler.length })}
            </h2>
            {/* ⚠ Mobilde 44px (İlke #8). */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setSecili(urunler.map((u) => u.variantId))}
                disabled={bekliyor}
              >
                {t("hepsiniSec")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setSecili([])}
                disabled={bekliyor}
              >
                {t("secimiTemizle")}
              </Button>
            </div>
          </div>
          <ul className="divide-y rounded-md border text-sm">
            {urunler.map((u) => (
              <li key={u.variantId}>
                {/* ⚠ TÜM SATIR TIKLANABİLİR — mobilde 44px hedef. */}
                <label className="flex min-h-11 cursor-pointer items-center gap-3 p-2">
                  <input
                    type="checkbox"
                    className="size-5 shrink-0"
                    checked={secili.includes(u.variantId)}
                    onChange={() => degistir(u.variantId)}
                    disabled={bekliyor}
                  />
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <KopyalanabilirKod deger={u.sku} etiket={t("skuEtiketi")} />
                    <span className="truncate">{u.ad}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ═══ ONAY ═══════════════════════════════════════════════════════ */}
      <section className="space-y-2 border-t pt-4">
        {/*
          ⛔ SEBEP EKRANDA YAZAR (İlke #5). Kilitli düğme sessiz kalmaz:
          niye ilerlemediği ve nasıl ilerleyeceği yazılıdır.
        */}
        {karar.tur !== "HAZIR" ? (
          <p className="text-muted-foreground text-sm">
            {t(`durum${karar.tur}` as "durumAYNI_RAF")}
          </p>
        ) : (
          <p className="text-sm font-medium">
            {t("ozet", {
              adet: karar.adet,
              kaynak: kaynak?.kod ?? "",
              hedef: hedef?.kod ?? "",
            })}
          </p>
        )}
        {/*
          ⚠ KISMÎ OLDUĞU AYRICA YAZAR: "rafı taşıdım" sanan biri, kalan
          ürünleri eski rafta arayamaz hâle gelirdi.
        */}
        {karar.tur === "HAZIR" && karar.kismi ? (
          <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
            {t("kismiUyari", {
              kalan: urunler.length - karar.adet,
              kaynak: kaynak?.kod ?? "",
            })}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={uygula}
          disabled={bekliyor || karar.tur !== "HAZIR"}
          className="h-11 w-full sm:w-auto"
        >
          <ArrowRight className="mr-1 size-4" aria-hidden />
          {t("tasi")}
        </Button>
      </section>
    </div>
  );
}
