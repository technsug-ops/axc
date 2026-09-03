import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import {
  marjPencereden,
  marjSebepAdresi,
  marjSerhi,
  type MarjSebebi,
} from "@/lib/ice-aktarma-serhi";
import { pencereCoz } from "@/lib/liste-suzgeci";
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
 *
 *  ⭐ İLKE #16 (Halil bulgusu 04.09.2026): her sebep satırı TIKLANINCA o
 *  rakamı üreten satış listesine gider — adres ve kimlik kümesi TEK
 *  sahibinden (`ice-aktarma-serhi`), sayı = liste. Adres, şerhin
 *  sayıldığı PENCEREYİ de taşır; pencereler ayrışsaydı sayı 1, liste 5
 *  gösterebilirdi.
 *
 *  ⚠ PENCERE PARAMETRELERDEN: çağıran sayfanın adres parametreleri
 *  (`pencere` · `baslangic` · `bitis`) verilirse şerh O pencereyi sayar —
 *  29.08.2026 dersi: süzülmüş ekranın üstünde defter-geneli sayı durması
 *  yanlış teşhise yol açıyor.
 * ============================================================================
 */
export async function MarjSerhi({
  parametreler,
}: {
  parametreler?: { pencere?: string; baslangic?: string; bitis?: string };
}) {
  const cozum = pencereCoz(parametreler ?? {});
  const s = await marjSerhi(prisma, marjPencereden(cozum.aralik));
  /** ⚠ SEBEPLERİN HEPSİ SIFIRSA ŞERH HİÇ ÇIKMAZ. */
  if (s.bekleyen === 0 && s.alimYok === 0 && s.donemDisi === 0) return null;

  const t = await getTranslations("iceAktarma");
  const bicim = await bicimlendirici();
  /** İlke #2: tıklanabilir, tıklanabilir GÖRÜNÜR. */
  const satirSinifi =
    "block tabular-nums underline decoration-dotted underline-offset-2 hover:opacity-75";
  const adres = (sebep: MarjSebebi) => marjSebepAdresi(sebep, parametreler);
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
          <Link href={adres("bekleyen")} className={satirSinifi}>
            {t("marjOkunamaz", { adet: s.bekleyen })}
          </Link>
        )}
        {s.alimYok === 0 ? null : (
          <Link href={adres("alimyok")} className={satirSinifi}>
            {t("marjAlimYok", { adet: s.alimYok })}
          </Link>
        )}
        {/*
          ⭐ ÜÇÜNCÜ SEBEP — VE BU KAPANABİLİR BİR AÇIK DEĞİL, TUTANAK.
          O mal alım defteri başlamadan ÖNCE alınmış; maliyet KAYNAĞI yok.
          Ekran bunu söylemezse biri kapatmaya çalışır ve kapatamaz.
          Satır yine de LİNK: kapatılamasa da hangi satışlar olduğu
          GÖRÜLEBİLİR olmalı. _(Anayasa: "kapanamayacak kayıp, görev değil
          kayıttır" — ve "tutanak, kusur ile sınırı ayırt ettirir".)_
        */}
        {s.donemDisi === 0 ? null : (
          <Link href={adres("donemdisi")} className={satirSinifi}>
            {t("marjDonemDisi", { adet: s.donemDisi })}
          </Link>
        )}
        {/*
          ⚠ OKUNABİLİR RAKAM DA YAZILIYOR. "Bu oran okunamaz" tek başına
          bir çıkmazdır; yanına maliyet bağı OLAN satışların marjı konunca
          kullanıcının elinde hâlâ karar verilebilir bir sayı kalır.
          ⚠ Bu satır LİNK DEĞİL: aksaklık değil, bilgilendirme (İlke #16
          aksaklık sayısına işler).
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
