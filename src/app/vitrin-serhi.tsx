import Link from "next/link";
import { Store, AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { vitrinSerhi } from "@/lib/panel/vitrin-serhi";
import type { VitrinKutusu as Veri } from "@/lib/panel/vitrin-verisi";

/**
 * ============================================================================
 *  "RAFTA VAR, VİTRİNDE YOK" — PANELDEKİ ŞERH (K244, 23.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE DÖKÜM PANELDEN KALKTI (kullanıcı kararı 23.09.2026):
 *  _"bu bölüm Kanal Listeleme sekmesine alınabilir; panelde sadece küçük bir
 *  uyarı olur."_ Ölçüldü: kutu kanal başına BİR kart çiziyor ve her kartta
 *  dört kutucuk var — bugün 3 kanal = 3 kart · 12 kutucuk, panelin yarısı.
 *  **Satır sayısı VERİYLE BİRLİKTE BÜYÜYOR** (11 kanal hedefi) ve İlke #13
 *  tam bunu yasaklıyor: _"özet ekranda döküm olmaz"_.
 *
 *  ⚠ ŞERH BİR HÜKÜMDÜR, DÖKÜM DEĞİL: tek satır, tek rakam, tek bağlantı.
 *  Döküm `/kanal-listeleme`de kendi sayfasında duruyor.
 *
 *  ⛔ AMA İKİ ŞEY PANELDEN KAYBOLMUYOR — İKİSİ DE ÖLÇÜLMÜŞ BİRER UYARI:
 *  ① rafta yatan sermaye (adet + tutar),
 *  ② ölçümün BAYAT ya da HİÇ YAPILMAMIŞ olması. İkincisi gizlenseydi
 *  kaçırılan bir gece koşumu panelde hiçbir iz bırakmazdı ve rakam TAZE
 *  sanılırdı _(anayasa: "kaçışın kendisi görünür kılınır")_.
 *
 *  ⚠ SIFIR SATIR GİZLENMEZ (İlke: "baktım, temiz" ile "bu satır yok" ayrı
 *  şeylerdir) — ama sıfırken BAĞLANTI da olmaz: açılacak liste yoktur ve
 *  tıklamak boş ekrana götürürdü (İlke #2).
 * ============================================================================
 */
export async function VitrinSerhi({ veri }: { veri: Veri[] }) {
  const t = await getTranslations("Vitrin");
  const bicim = await bicimlendirici();

  /** ⚠ HÜKÜM SAF GÖVDEDEN: bu bileşen yalnız çiziyor, saymıyor. */
  const s = vitrinSerhi(veri);

  /** Kanal hiç ölçülmemişse kutu zaten yok — şerh de çizilmez. */
  if (veri.length === 0) return null;

  const temiz = s.adet === 0;

  return (
    <div
      className={`flex h-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm ${
        temiz && !s.dikkatGerek ? "" : DURUM_KUTUSU.uyari
      }`}
    >
      <Store className="size-4 shrink-0" aria-hidden />
      <span className="font-medium">{t("baslik")}</span>

      {/* ⚠ RAKAM ÖNCE, GEREKÇE SONRA — okuyan tek bakışta hükmü görür. */}
      <span className="tabular-nums">
        {temiz
          ? t("serhTemiz")
          : t("ozet", { adet: s.adet, tutar: bicim.para(s.tutar, "TRY") })}
      </span>

      {/* ⛔ ÖLÇÜMÜN YAŞI PANELDEN KAYBOLMAZ: bayat bir rakam taze sanılmasın. */}
      {s.dikkatGerek ? (
        <span className={`inline-flex items-center gap-1 ${DURUM_YAZISI.uyari}`}>
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          {t("serhOlcumUyarisi", { kanal: s.dikkatKanalSayisi })}
        </span>
      ) : null}

      {/*
        ⚠ SIFIRDA BAĞLANTI YOK (İlke #2): açılacak liste yokken tıklanabilir
        görünmek, kullanıcıyı boş ekrana yollamaktır. Ölçüm uyarısı varsa
        bağlantı KALIR — orada bakılacak bir şey vardır.
      */}
      {temiz && !s.dikkatGerek ? null : (
        <Link
          href="/kanal-listeleme"
          className="text-primary ml-auto shrink-0 underline-offset-4 hover:underline"
        >
          {t("serhAc")}
        </Link>
      )}
    </div>
  );
}
