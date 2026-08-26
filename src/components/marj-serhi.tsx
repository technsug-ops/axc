import { TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { marjSerhi } from "@/lib/ice-aktarma-serhi";
import { prisma } from "@/lib/prisma";
import { DURUM_KUTUSU } from "@/lib/renkler";

/**
 * ============================================================================
 *  MARJ ŞERHİ — [YANLIŞ CEVAP VEREN EKRAN]
 * ----------------------------------------------------------------------------
 *  İçe aktarılan satışlar CİROYA giriyor, NET'e girmiyor. Marj oranı bu
 *  yüzden olduğundan DÜŞÜK görünüyor — haziran %0,3, temmuz %0,2.
 *
 *  ⚠ İKİ RAKAM YAN YANA. Yalnız "okunamaz" demek kullanıcıyı boşta
 *  bırakırdı; okunabilir olan rakam da yazılıyor ki karar verecek bir şey
 *  kalsın. _(İlke #5: sessiz durum yok — neyin niye olmadığı yazar.)_
 *
 *  ⚠ SÖNME ŞARTI: `profitStatus` dolduğu an. Ölçüt `importBatch` DEĞİL —
 *  maliyet bağı kurulunca satır hâlâ `importBatch` taşıyacak ama şerhe
 *  girmemeli.
 * ============================================================================
 */
export async function MarjSerhi({
  pencere,
}: {
  pencere?: { bas: Date; son: Date };
}) {
  const s = await marjSerhi(prisma, pencere);
  /** ⚠ İKİ SEBEBİN İKİSİ DE SIFIRSA ŞERH HİÇ ÇIKMAZ. */
  if (s.bekleyen === 0 && s.alimYok === 0 && s.donemDisi === 0) return null;

  const t = await getTranslations("iceAktarma");
  const bicim = await bicimlendirici();
  return (
    <div
      className={`flex gap-2 rounded-md border border-dashed p-3 text-xs ${DURUM_KUTUSU.uyari}`}
    >
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="space-y-1">
        {/*
          ⚠ İKİ SEBEP AYRI SATIR — VE ÇÖZÜMÜN YERİ FARKLI OLDUĞU İÇİN.
          "Bağ bekliyor" satış tarafında bir iş; "alım kaydı yok" ALIM
          defterinde. Tek cümleye karışsalardı okuyan yanlış tarafta
          çözüm arardı. _(Halil kararı 26.08.2026.)_
        */}
        {s.bekleyen === 0 ? null : (
          <span className="block tabular-nums">
            {t("marjOkunamaz", { adet: s.bekleyen })}
          </span>
        )}
        {s.alimYok === 0 ? null : (
          <span className="block tabular-nums">
            {t("marjAlimYok", { adet: s.alimYok })}
          </span>
        )}
        {/*
          ⭐ ÜÇÜNCÜ SEBEP — VE BU KAPANABİLİR BİR AÇIK DEĞİL, TUTANAK.
          O mal alım defteri başlamadan ÖNCE alınmış; maliyet KAYNAĞI yok.
          Ekran bunu söylemezse biri kapatmaya çalışır ve kapatamaz.
          _(Anayasa: "kapanamayacak kayıp, görev değil kayıttır" —
          ve "tutanak, kusur ile sınırı ayırt ettirir".)_
        */}
        {s.donemDisi === 0 ? null : (
          <span className="block tabular-nums">
            {t("marjDonemDisi", { adet: s.donemDisi })}
          </span>
        )}
        {/*
          ⚠ OKUNABİLİR RAKAM DA YAZILIYOR. "Bu oran okunamaz" tek başına
          bir çıkmazdır; yanına maliyet bağı OLAN satışların marjı konunca
          kullanıcının elinde hâlâ karar verilebilir bir sayı kalır.
        */}
        {s.baglıMarj === null ? null : (
          <span className="block tabular-nums">
            {t("marjBagliOlan", { oran: bicim.yuzde(s.baglıMarj) })}
          </span>
        )}
      </div>
    </div>
  );
}
