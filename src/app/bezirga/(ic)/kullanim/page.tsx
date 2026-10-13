import Link from "@/components/niyetli-baglanti";
import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { gunMetninden } from "@/lib/donem";
import { KULLANIM_CIHAZLARI } from "@/lib/kullanim/olay";
import {
  cubukYuzdesi,
  donemBasiAni,
  donemIlkGunu,
  donemSec,
  hedefGorunumu,
  KULLANIM_DONEMLERI,
  saatKovalariniDagit,
  type SaatKovasi,
} from "@/lib/kullanim/rapor";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { sistemPrisma } from "@/lib/prisma";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { SayfaBasligi } from "../sayfa-basligi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tMenu = await getTranslations("YonetimMenu");
  return { title: tMenu("kullanim") };
}

/** Liste bölümlerinde gösterilen en çok satır — kalanı sayıyla söylenir (İlke #13: özet ekranda döküm olmaz). */
const ILK_N = 15;

/**
 * ============================================================================
 *  KULLANIM — süper admin (K334 ② · kullanıcı kararı 13.10.2026 «kalıbı
 *  adminde dursun»). Referans iskeletin `metricsView`'ü: KPI + yatay çubuklar
 *  (`yn-frow`) + gün/saat sütunları (`yn-wau`).
 *
 *  · Sayılar VERİTABANINDA toplanır (groupBy) — satır satır çekilmez; sorgu
 *    sayısı olay sayısıyla büyümez (anayasa: yavaşlık ölçeklenme biçimidir).
 *  · Gün/saat dağılımı UTC saat kovalarından İŞ saat dilimine çevrilir
 *    (`saatKovalariniDagit`, saf gövde) — çalışma ortamının saat dilimi okunmaz.
 *  · Süzgeç (firma · dönem) ADRESTE; KPI'lar süzgeçle birlikte değişir (İlke #15).
 *  · İz salt okunur; bu ekran hiçbir şey yazmaz.
 * ============================================================================
 */
export default async function KullanimSayfasi({ searchParams }: { searchParams: Promise<{ f?: string; d?: string }> }) {
  await yonetimSayfasi();
  const sp = await searchParams;
  const t = await getTranslations("YonetimKullanim");
  const bicim = await bicimlendirici();

  const gunSayisi = donemSec(sp.d);
  const ilkGun = donemIlkGunu(new Date(), gunSayisi);
  const bas = donemBasiAni(ilkGun);
  // SISTEM: yönetim katmanı — firmalar-üstü liste (süzgeç seçenekleri ve ad eşlemesi).
  const firmalar = await sistemPrisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const firmaId = firmalar.some((f) => f.id === sp.f) ? sp.f! : null;
  const kosul = { createdAt: { gte: bas }, ...(firmaId ? { companyId: firmaId } : {}) };

  const [turler, kisiler, sayfalar, dugmeler, gecisler, cihazlar, firmaTurleri, firmaKisileri, firmaSon, ilkIz, kovaHam] = await Promise.all([
    // SISTEM: yönetim katmanı — kullanım izi firmalar-üstü okunur (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["tur"], where: kosul, _count: { _all: true } }),
    // SISTEM: yönetim katmanı — kullanım izi (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["userId"], where: { ...kosul, userId: { not: null } } }),
    // SISTEM: yönetim katmanı — kullanım izi (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["sayfa"], where: { ...kosul, tur: "SAYFA" }, _count: { _all: true }, orderBy: { _count: { sayfa: "desc" } } }),
    // SISTEM: yönetim katmanı — kullanım izi (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["sayfa", "hedef"], where: { ...kosul, tur: "TIKLAMA" }, _count: { _all: true }, orderBy: { _count: { hedef: "desc" } } }),
    // SISTEM: yönetim katmanı — kullanım izi (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["oncekiSayfa", "sayfa"], where: { ...kosul, tur: "SAYFA" }, _count: { _all: true }, orderBy: { _count: { sayfa: "desc" } } }),
    // SISTEM: yönetim katmanı — kullanım izi (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["cihaz"], where: kosul, _count: { _all: true } }),
    // SISTEM: yönetim katmanı — kullanım izi (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["companyId", "tur"], where: kosul, _count: { _all: true } }),
    // SISTEM: yönetim katmanı — kullanım izi (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["companyId", "userId"], where: { ...kosul, userId: { not: null } } }),
    // SISTEM: yönetim katmanı — kullanım izi (salt okuma).
    sistemPrisma.kullanimOlayi.groupBy({ by: ["companyId"], where: kosul, _max: { createdAt: true } }),
    // SISTEM: yönetim katmanı — izin doğum tarihi (süzgeçsiz; «kayıt yok» ne zamandan beri hüküm).
    sistemPrisma.kullanimOlayi.aggregate({ _min: { createdAt: true } }),
    firmaId
      ?
        // SISTEM: yönetim katmanı — UTC saat kovaları (en çok 24 × gün satır; olay sayısıyla büyümez).
        sistemPrisma.$queryRaw<{ saat: string; adet: bigint }[]>`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H') AS saat, COUNT(*) AS adet FROM KullanimOlayi WHERE createdAt >= ${bas} AND companyId = ${firmaId} GROUP BY saat`
      :
        // SISTEM: yönetim katmanı — UTC saat kovaları, bütün firmalar (en çok 24 × gün satır).
        sistemPrisma.$queryRaw<{ saat: string; adet: bigint }[]>`SELECT DATE_FORMAT(createdAt, '%Y-%m-%d %H') AS saat, COUNT(*) AS adet FROM KullanimOlayi WHERE createdAt >= ${bas} GROUP BY saat`,
  ]);

  const turAdedi = (tur: "SAYFA" | "TIKLAMA") => turler.find((x) => x.tur === tur)?._count._all ?? 0;
  const sayfaToplam = turAdedi("SAYFA");
  const tiklamaToplam = turAdedi("TIKLAMA");
  const firmaSayisi = new Set(firmaTurleri.map((x) => x.companyId).filter((x) => x !== null)).size;
  const kovalar: SaatKovasi[] = kovaHam.map((k) => ({ an: new Date(`${k.saat.replace(" ", "T")}:00:00Z`), adet: Number(k.adet) }));
  const { gunler, saatler } = saatKovalariniDagit(kovalar, ilkGun, gunSayisi);
  const enBuyukGun = Math.max(0, ...gunler.map((g) => g.adet));
  const enBuyukSaat = Math.max(0, ...saatler);
  const firmaAdi = new Map(firmalar.map((f) => [f.id, f.name]));

  const firmaSatirlari = [...new Set(firmaTurleri.map((x) => x.companyId))].map((id) => ({
    id,
    sayfa: firmaTurleri.find((x) => x.companyId === id && x.tur === "SAYFA")?._count._all ?? 0,
    tiklama: firmaTurleri.find((x) => x.companyId === id && x.tur === "TIKLAMA")?._count._all ?? 0,
    kisi: firmaKisileri.filter((x) => x.companyId === id).length,
    son: firmaSon.find((x) => x.companyId === id)?._max.createdAt ?? null,
  })).sort((a, b) => b.sayfa + b.tiklama - (a.sayfa + a.tiklama));

  const adres = (degisen: { f?: string | null; d?: number }) => {
    const p = new URLSearchParams();
    const f = degisen.f === undefined ? firmaId : degisen.f;
    const d = degisen.d ?? gunSayisi;
    if (f) p.set("f", f);
    p.set("d", String(d));
    return `${YONETIM_YOLU}/kullanim?${p.toString()}`;
  };

  const sayfaAdi = (kalip: string | null) => kalip ?? t("ilkAcilis");
  const hedefMetni = (hedef: string | null) => {
    if (!hedef) return "—";
    const h = hedefGorunumu(hedef);
    if (h.tur === "DIS") return t("disBaglanti");
    if (h.tur === "BAGLANTI") return `${t("baglantiOnEki")} ${h.kalip}`;
    return h.metin;
  };
  const altNot = (toplam: number) => (toplam > ILK_N ? t("ilkN", { n: ILK_N, toplam }) : t("tumu", { toplam }));

  const cubukListesi = ({ satirlar, toplam }: { satirlar: { anahtar: string; etiket: string; adet: number }[]; toplam: number }) => {
    const enBuyuk = Math.max(0, ...satirlar.map((s) => s.adet));
    return satirlar.length === 0 ? (
      <p className="yn-muted yn-small">{t("bos")}</p>
    ) : (
      <>
        {satirlar.slice(0, ILK_N).map((s) => (
          <div key={s.anahtar} className="yn-frow">
            <span title={s.etiket}>{s.etiket}</span>
            <div className="yn-fbar"><i style={{ width: `${cubukYuzdesi(s.adet, enBuyuk)}%` }} /></div>
            <b>{bicim.sayi(s.adet)}</b>
          </div>
        ))}
        <p className="yn-muted yn-small" style={{ margin: "8px 0 0" }}>{altNot(toplam)}</p>
      </>
    );
  };

  return (
    <>
      <SayfaBasligi baslik={t("baslik")} aciklama={t("aciklama")} />

      <form method="get" action={`${YONETIM_YOLU}/kullanim`} className="yn-suzgec">
        <label className="yn-small yn-muted" htmlFor="kullanim-firma">{t("firmaSuzgeci")}</label>
        <select id="kullanim-firma" name="f" defaultValue={firmaId ?? ""}>
          <option value="">{t("tumFirmalar")}</option>
          {firmalar.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <label className="yn-small yn-muted" htmlFor="kullanim-donem">{t("donemSuzgeci")}</label>
        <select id="kullanim-donem" name="d" defaultValue={String(gunSayisi)}>
          {KULLANIM_DONEMLERI.map((d) => <option key={d} value={d}>{t("donemGun", { gun: d })}</option>)}
        </select>
        <button type="submit" className="yn-btn primary">{t("goster")}</button>
      </form>

      <div className="yn-kpis">
        <div className="yn-card yn-kpi"><span>{t("kpiSayfa")}</span><b>{bicim.sayi(sayfaToplam)}</b><small>{t("kpiAlt", { gun: gunSayisi })}</small></div>
        <div className="yn-card yn-kpi"><span>{t("kpiTiklama")}</span><b>{bicim.sayi(tiklamaToplam)}</b><small>{t("kpiAlt", { gun: gunSayisi })}</small></div>
        <div className="yn-card yn-kpi"><span>{t("kpiKisi")}</span><b>{bicim.sayi(kisiler.length)}</b><small>{t("kpiKisiAlt")}</small></div>
        <div className="yn-card yn-kpi"><span>{t("kpiFirma")}</span><b>{bicim.sayi(firmaSayisi)}</b><small>{t("kpiAlt", { gun: gunSayisi })}</small></div>
      </div>

      <div className="yn-grid2 yn-sect">
        <section className="yn-card">
          <h2>{t("bolumSayfalar")}</h2>
          {cubukListesi({ toplam: sayfalar.length, satirlar: sayfalar.map((s) => ({ anahtar: s.sayfa, etiket: s.sayfa, adet: s._count._all })) })}
        </section>
        <section className="yn-card">
          <h2>{t("bolumGecisler")}</h2>
          {cubukListesi({
            toplam: gecisler.length,
            satirlar: gecisler.map((g) => ({ anahtar: `${g.oncekiSayfa ?? ""}>${g.sayfa}`, etiket: `${sayfaAdi(g.oncekiSayfa)} → ${g.sayfa}`, adet: g._count._all })),
          })}
        </section>
      </div>

      <section className="yn-card yn-sect">
        <h2>{t("bolumDugmeler")}</h2>
        {cubukListesi({
          toplam: dugmeler.length,
          satirlar: dugmeler.map((d) => ({ anahtar: `${d.sayfa}|${d.hedef ?? ""}`, etiket: `${d.sayfa} · ${hedefMetni(d.hedef)}`, adet: d._count._all })),
        })}
      </section>

      <section className="yn-card yn-sect">
        <h2>{t("bolumGunler")}</h2>
        <div className="yn-wau">
          {gunler.map((g) => {
            const etiket = bicim.tarih(gunMetninden(g.gun)!).slice(0, 5);
            return (
              <div key={g.gun} className="yn-wcol" title={t("gunEtiketi", { gun: etiket, adet: g.adet })}>
                <b>{g.adet > 0 ? bicim.sayi(g.adet) : ""}</b>
                <i style={{ height: `${cubukYuzdesi(g.adet, enBuyukGun)}px` }} />
                <span>{etiket}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="yn-grid2 yn-sect">
        <section className="yn-card">
          <h2>{t("bolumSaatler")}</h2>
          <div className="yn-wau">
            {saatler.map((adet, saat) => (
              <div key={saat} className="yn-wcol" title={t("saatEtiketi", { saat: String(saat).padStart(2, "0"), adet })}>
                <b>{adet > 0 ? bicim.sayi(adet) : ""}</b>
                <i style={{ height: `${cubukYuzdesi(adet, enBuyukSaat)}px` }} />
                <span>{String(saat).padStart(2, "0")}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="yn-card">
          <h2>{t("bolumCihaz")}</h2>
          {cubukListesi({
            toplam: KULLANIM_CIHAZLARI.length,
            satirlar: KULLANIM_CIHAZLARI.map((c) => ({ anahtar: c, etiket: t(`cihaz_${c}`), adet: cihazlar.find((x) => x.cihaz === c)?._count._all ?? 0 })),
          })}
        </section>
      </div>

      <section className="yn-sect">
        <h2>{t("bolumFirmalar")}</h2>
        {firmaSatirlari.length === 0 ? (
          <div className="yn-card yn-muted">{t("bos")}</div>
        ) : (
          <div className="yn-tablewrap">
            <table>
              <thead>
                <tr>
                  <th>{t("sutunFirma")}</th>
                  <th className="num">{t("sutunSayfa")}</th>
                  <th className="num">{t("sutunTiklama")}</th>
                  <th className="num">{t("sutunKisi")}</th>
                  <th>{t("sutunSon")}</th>
                </tr>
              </thead>
              <tbody>
                {firmaSatirlari.map((f) => (
                  <tr key={f.id ?? "-"}>
                    <td>{f.id ? <Link href={adres({ f: f.id })} className="yn-link">{firmaAdi.get(f.id) ?? f.id}</Link> : <span className="yn-muted">{t("firmasiz")}</span>}</td>
                    <td className="num">{bicim.sayi(f.sayfa)}</td>
                    <td className="num">{bicim.sayi(f.tiklama)}</td>
                    <td className="num">{bicim.sayi(f.kisi)}</td>
                    <td className="nw yn-muted">{f.son ? bicim.tarihSaat(f.son) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {ilkIz._min.createdAt ? <p className="yn-muted yn-small yn-sect">{t("dogumNotu", { tarih: bicim.tarih(ilkIz._min.createdAt) })}</p> : null}
    </>
  );
}
