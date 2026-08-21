"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, Info, Trophy } from "lucide-react";

import { MarjPili } from "@/components/marj-pili";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBicim } from "@/lib/bicim-istemci";
import { VARSAYILAN_KDV_ORANI } from "@/lib/kar";
import { marjBandi } from "@/lib/marj-bantlari";
import { ciroMarjiMetni } from "@/lib/marj-gosterge";
import { DURUM_KUTUSU, DURUM_SERIDI, DURUM_YAZISI } from "@/lib/renkler";
import {
  girdiEksikMi,
  simulasyonKarsilastir,
  type KanalSonucu,
} from "@/lib/simulasyon/karsilastir";

/**
 * ============================================================================
 *  FİYAT DENEMESİ — EKRAN
 * ----------------------------------------------------------------------------
 *  ⚠ BU EKRAN BİR KEZ YENİDEN YAZILDI (21.08.2026). İlk hâli GET formu +
 *  sekiz sütunluk tabloydu; kullanıcı haklı olarak beğenmedi. Üç somut kusur:
 *
 *    1. HER SATIRDA PARAGRAF. Kaynak notu (2–3 satırlık cümle) her kanal
 *       satırının içine basılıyordu; tablo rakam değil METİN duvarıydı.
 *    2. SEKİZ SÜTUN. Telefonda yatay kaydırma zorunluydu (İlke #8).
 *    3. GÖNDER-BEKLE. Her deneme için form gönderiliyordu; oysa denemenin
 *       tamamı "rakamı değiştir, ne olduğuna bak" işidir.
 *
 *  Yeni hâl, depoda ZATEN OTURMUŞ dili izliyor (`kart/[variantId]/fiyat-dene`):
 *  istemcide canlı hesap, kanal başına KUTU, kaynak bir ROZET — notun kendisi
 *  ipucunda. Sıralama motordan geliyor ve KAZANAN vurgulanıyor.
 *
 *  ── HESAP İSTEMCİDE, VERİ SUNUCUDA DEĞİL ────────────────────────────────
 *  Karşılaştırma saf bir işlev ve veritabanına gitmiyor; her tuşta sunucuya
 *  gitmek denemeyi ağır ve isteksiz kılardı. (Aynı gerekçe `FiyatDene`de de
 *  yazılı — iki ekran aynı kararı iki kez vermesin diye buraya da yazıldı.)
 * ============================================================================
 */
export function Deneme({ bugun }: { bugun: string }) {
  const t = useTranslations("Simulasyon");
  const bicim = useBicim();

  const [satis, setSatis] = useState("");
  const [alis, setAlis] = useState("");
  const [komisyon, setKomisyon] = useState("");
  const [kdv, setKdv] = useState(String(VARSAYILAN_KDV_ORANI));
  const [kargo, setKargo] = useState("");
  const [kdvDahil, setKdvDahil] = useState(true);

  const sayi = (m: string) => (m.trim() === "" ? Number.NaN : Number(m));
  const girdi = {
    kdvDahilMi: kdvDahil,
    satisFiyati: sayi(satis),
    alisFiyati: sayi(alis),
    komisyonOrani: sayi(komisyon),
    kdvOrani: sayi(kdv),
    kargoUcreti: kargo.trim() === "" ? null : sayi(kargo),
  };

  const eksik = girdiEksikMi(girdi);
  /**
   * ⚠ "BUGÜN" SUNUCUDAN GELİYOR, `new Date()` DEĞİL. İş saat dilimi sabittir
   * (Europe/Istanbul) ve tarayıcının saat dilimi ASLA kullanılmaz — anayasa.
   */
  const sonuclar = eksik ? [] : simulasyonKarsilastir(girdi, new Date(bugun));
  const para = (n: number) => bicim.para(n, "TRY");

  return (
    <div className="space-y-6">
      {/* ══════════════ GİRDİ ══════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Alan
          etiket={t("satisFiyati")}
          deger={satis}
          degistir={setSatis}
          ipucu={t("ornek", { deger: "1.000" })}
        />
        <Alan
          etiket={t("alisFiyati")}
          deger={alis}
          degistir={setAlis}
          ipucu={t("ornek", { deger: "500" })}
        />
        <Alan
          etiket={t("komisyonOrani")}
          deger={komisyon}
          degistir={setKomisyon}
          ipucu={t("ornek", { deger: "15" })}
        />
        <Alan
          etiket={t("kdvOrani")}
          deger={kdv}
          degistir={setKdv}
          ipucu={t("ornek", { deger: "20" })}
        />
        <Alan
          etiket={t("kargoUcreti")}
          deger={kargo}
          degistir={setKargo}
          ipucu={t("ornek", { deger: "120" })}
          not={t("kargoIpucu")}
        />

        {/* ── KDV DİLİ — İKİ SEÇENEK DE GÖRÜNÜR ────────────────────────────
            ⚠ ONAY KUTUSU DEĞİL. Tek kutu olsaydı "işaretli değilse ne
            oluyor" sorusu ekranda cevapsız kalırdı ve hangi dilde girdiğini
            bilmeyen kullanıcı rakamları %20 yanlış girerdi. */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t("kdvDili")}</span>
          <div className="border-input flex h-11 overflow-hidden rounded-md border">
            {[
              { deger: true, etiket: t("kdvDahil") },
              { deger: false, etiket: t("kdvHaric") },
            ].map((s) => (
              <button
                key={String(s.deger)}
                type="button"
                onClick={() => setKdvDahil(s.deger)}
                aria-pressed={kdvDahil === s.deger}
                className={`flex-1 text-sm transition-colors ${
                  kdvDahil === s.deger
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted"
                }`}
              >
                {s.etiket}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════ SONUÇ ══════════════
          ⚠ BOŞ FORMDA KUTU ÇİZİLMEZ: sıfır satış "0 kâr" değil, cevapsız
          sorudur. Sıfır duvarı hesaplanmış gibi okunurdu (İlke #5). */}
      {eksik ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sonuclar.map((s, i) => (
            <KanalKutusu
              key={s.kod}
              sonuc={s}
              kazanan={i === 0 && s.net2 !== null}
              para={para}
              yuzde={bicim.yuzde}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Tek girdi alanı — etiket, sayı kutusu ve isteğe bağlı alt not. */
function Alan({
  etiket,
  deger,
  degistir,
  ipucu,
  not,
}: {
  etiket: string;
  deger: string;
  degistir: (d: string) => void;
  ipucu: string;
  not?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{etiket}</Label>
      {/* MOBİLDE 44 px (İlke #8): `h-11` dokunulabilir yükseklik. */}
      <Input
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        value={deger}
        onChange={(e) => degistir(e.target.value)}
        /* YER TUTUCU DEĞER GİBİ GÖRÜNMEZ (İlke #11): "örn." şart. */
        placeholder={ipucu}
        className="h-11"
      />
      {not ? <p className="text-muted-foreground text-xs">{not}</p> : null}
    </div>
  );
}

/**
 * ── KANAL KUTUSU — ÜÇ KATMAN ────────────────────────────────────────────
 * Renk sistemi (lib/renkler.ts): K1 sol şerit · K2 pastel zemin · K3 koyu
 * rakam. Kazanan kanal şeritle ayrılıyor; ötekiler nötr kalıyor — "nötr
 * taban ~%70" kısıtı gereği her kutu renkli değil.
 */
function KanalKutusu({
  sonuc,
  kazanan,
  para,
  yuzde,
}: {
  sonuc: KanalSonucu;
  kazanan: boolean;
  para: (n: number) => string;
  yuzde: (n: number, b?: number) => string;
}) {
  const t = useTranslations("Simulasyon");
  const bant = marjBandi(sonuc.ciroMarji);
  const hesaplandi = sonuc.net2 !== null;
  const zarar = hesaplandi && sonuc.net2! < 0;

  return (
    <div
      className={`min-w-0 rounded-lg border p-4 ${
        kazanan ? DURUM_SERIDI.olumlu : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {kazanan ? (
              <Trophy className={`size-4 shrink-0 ${DURUM_YAZISI.olumlu}`} />
            ) : null}
            <span className="truncate font-medium">{sonuc.ad}</span>
          </div>
          {/* ⚠ KAYNAK ROZETİ — ölçülmüş mü, dış iddia mı. Notun KENDİSİ
              ipucunda: her kutuya paragraf basmak ekranı metin duvarı
              yapıyordu (ilk sürümün kusuru). */}
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
              DURUM_KUTUSU[sonuc.kaynak === "OLCULDU" ? "olumlu" : "uyari"]
            }`}
            title={`${sonuc.kaynakNotu}${
              sonuc.belirsizlik ? `\n\n⚠ ${sonuc.belirsizlik}` : ""
            }`}
          >
            {sonuc.kaynak === "OLCULDU" ? (
              <Crown className="size-3" />
            ) : (
              <Info className="size-3" />
            )}
            {t(`kaynak_${sonuc.kaynak}`)}
          </span>
        </div>

        {/* NET-2 — kutunun HÜKMÜ, en büyük rakam. */}
        <div className="text-right">
          <div className="text-muted-foreground text-xs">{t("net2")}</div>
          <div
            className={`text-xl font-semibold tabular-nums ${
              hesaplandi ? DURUM_YAZISI[zarar ? "olumsuz" : "olumlu"] : ""
            }`}
          >
            {hesaplandi ? para(sonuc.net2!) : "—"}
          </div>
        </div>
      </div>

      {/* KOMPAKT KUTUCUK IZGARASI (İlke #12) — "etiket solda rakam sağda"
          tam genişlik satırı YASAK; göz aradaki boşluğu kat etmesin. */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Rakam
          etiket={t("komisyon")}
          deger={
            sonuc.komisyonOrani === null ? "—" : yuzde(sonuc.komisyonOrani)
          }
        />
        <Rakam
          etiket={t("net1")}
          deger={sonuc.net1 === null ? "—" : para(sonuc.net1)}
        />
        <div className="bg-muted/40 min-w-0 rounded-md border px-2 py-1.5">
          <div className="text-muted-foreground text-xs">{t("marj")}</div>
          <div className="mt-0.5 flex justify-center">
            {bant === null || sonuc.ciroMarji === null ? (
              <span className="text-muted-foreground text-sm">—</span>
            ) : (
              <MarjPili
                bant={bant}
                metin={ciroMarjiMetni(sonuc.ciroMarji)!}
                durumMetni={t(`bant_${bant}`)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ⚠ BEYANLAR SESSİZ KALMAZ. Motor "maliyet yok", "oran yok" diyorsa
          ekranda görünmeli; yoksa motorun dürüstlüğü kullanıcıya ulaşmaz. */}
      {sonuc.beyanlar.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {sonuc.beyanlar.map((b) => (
            <li
              key={b.tur}
              className={`rounded px-2 py-1 text-xs ${DURUM_KUTUSU.uyari}`}
            >
              {t(`beyan_${b.tur}`)}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Belirsizlik rozetin ipucunda ama GÖRÜNÜR de olmalı — dokunmatikte
          ipucu okunmaz (kısıt: renk/ipucu tek başına konuşmaz). */}
      {sonuc.belirsizlik ? (
        <p className="text-muted-foreground mt-2 text-xs italic">
          ⚠ {sonuc.belirsizlik}
        </p>
      ) : null}
    </div>
  );
}

function Rakam({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="bg-muted/40 min-w-0 rounded-md border px-2 py-1.5">
      <div className="text-muted-foreground text-xs">{etiket}</div>
      <div className="truncate text-sm font-medium tabular-nums">{deger}</div>
    </div>
  );
}
