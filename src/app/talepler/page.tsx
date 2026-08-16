import { getTranslations } from "next-intl/server";

import { Ekler } from "@/app/iadeler/ekler";
import { Baglanti } from "@/components/baglanti";
import { DurumRozeti } from "@/components/durum-rozeti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { EK_SINIRLARI } from "@/lib/ekler";
import { prisma } from "@/lib/prisma";
import { DURUM_KUTUSU } from "@/lib/renkler";
import {
  TALEP_DURUMLARI,
  TALEP_TURLERI,
  acikMi,
  firmaSutunuGorunsunMu,
  talepSuzgeci,
  type TalepDurumu,
  type TalepTuru,
} from "@/lib/talep/turler";
import { izinVarMi, sayfaGirisi } from "@/lib/yetki";

import { DurumKontrolu } from "./durum-kontrolu";

/**
 * ============================================================================
 *  DESTEK TALEPLERİ
 * ----------------------------------------------------------------------------
 *  ── HERKES GÖRÜR, YALNIZ YETKİLİ İLERLETİR ──────────────────────────────
 *  Sayfa izin İSTEMEZ: kullanıcı bildirdiği şeyin nerede olduğunu görmeli,
 *  yoksa "kör kutuya attım" hissi doğar ve modül varlık sebebini kaybeder.
 *  Durumu değiştirmek `destek.yonet` ister; yetkisiz kullanıcıda kontrol
 *  HİÇ çizilmez (pasif düğme değil — İlke #5).
 *
 *  ── SÜZGEÇ ADRESTE YAŞAR ────────────────────────────────────────────────
 *  Geri tuşu çalışsın, link paylaşılabilsin diye (lib/suzgec.ts ilkesi).
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("talepler") };
}

export default async function TaleplerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; tur?: string }>;
}) {
  const baglam = await sayfaGirisi();

  const { durum, tur } = await searchParams;
  const t = await getTranslations("Talep");
  const tEkler = await getTranslations("Ekler");
  const bicim = await bicimlendirici();

  /**
   * DESTEK VEREN Mİ, TALEP AÇAN MI (mimar düzeltmesi 16.08.2026).
   *
   * Destek veren taraf GELİŞTİRİCİDİR ve bütün firmaların taleplerini
   * görür; müşteri firma yalnız kendi taleplerini. Bugün tek firma olduğu
   * için iki dal aynı sonucu veriyor — fark ikinci firma geldiğinde
   * ortaya çıkar ve o gün eksik olsaydı bir firma diğerinin talebini
   * OKUMUŞ olurdu.
   */
  const yonetebilir = await izinVarMi("destek.yonet");
  const firmaSuzgeci = talepSuzgeci({
    companyId: baglam.companyId,
    destekVerir: yonetebilir,
  });
  const firmaGoster = firmaSutunuGorunsunMu(yonetebilir);

  /** Bilinmeyen süzgeç değeri SESSİZCE yok sayılır, boş liste getirmez. */
  const durumSuzgeci = (TALEP_DURUMLARI as readonly string[]).includes(
    durum ?? "",
  )
    ? (durum as TalepDurumu)
    : null;
  const turSuzgeci = (TALEP_TURLERI as readonly string[]).includes(tur ?? "")
    ? (tur as TalepTuru)
    : null;

  const talepler = await prisma.talep.findMany({
    where: {
      // FİRMA SÜZGECİ İLK SIRADA — diğerleri onun içinde daraltır.
      ...firmaSuzgeci,
      ...(durumSuzgeci ? { durum: durumSuzgeci } : {}),
      ...(turSuzgeci ? { tur: turSuzgeci } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      kod: true,
      tur: true,
      durum: true,
      baslik: true,
      aciklama: true,
      rota: true,
      tarayici: true,
      cozumNotu: true,
      cozumNotuZamani: true,
      cozumNotuYazan: { select: { name: true, email: true } },
      createdAt: true,
      kapatilmaZamani: true,
      bildiren: { select: { email: true, name: true } },
      company: { select: { name: true, code: true } },
    },
  });

  /** EKLER TEK SORGUDA — satır başına sorgu 50 talepte 50 gidiş geliş olurdu. */
  const ekKayitlari = await prisma.attachment.findMany({
    where: { targetType: "Talep", targetId: { in: talepler.map((x) => x.id) } },
    orderBy: { uploadedAt: "asc" },
    select: {
      id: true,
      targetId: true,
      fileName: true,
      sizeBytes: true,
      blobPath: true,
    },
  });
  const eklerHaritasi = new Map<string, typeof ekKayitlari>();
  for (const e of ekKayitlari) {
    const liste = eklerHaritasi.get(e.targetId) ?? [];
    liste.push(e);
    eklerHaritasi.set(e.targetId, liste);
  }
  const ekSinirlari = tEkler("sinirlar", {
    mb: EK_SINIRLARI.enFazlaBayt / (1024 * 1024),
    adet: EK_SINIRLARI.enFazlaEk,
  });

  const adres = (d: string | null, r: string | null) => {
    const p = new URLSearchParams();
    if (d) p.set("durum", d);
    if (r) p.set("tur", r);
    const q = p.toString();
    return q ? `/talepler?${q}` : "/talepler";
  };

  const rozetDurumu = (d: TalepDurumu) =>
    d === "COZULDU" || d === "KAPANDI"
      ? ("olumlu" as const)
      : d === "REDDEDILDI"
        ? ("olumsuz" as const)
        : d === "ERTELENDI"
          ? ("uyari" as const)
          : ("bilgi" as const);

  const acikSayisi = talepler.filter((x) => acikMi(x.durum)).length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("listeBaslik")}</h1>
        <p className="text-muted-foreground text-sm">
          {firmaGoster ? t("listeNotuDestek") : t("listeNotu")}
        </p>
      </div>

      {/* ---------------------------- SÜZGEÇLER --------------------------- */}
      <div className="flex flex-wrap gap-1.5">
        <Baglanti
          href={adres(null, turSuzgeci)}
          className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm no-underline md:min-h-9 ${
            durumSuzgeci === null ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
          }`}
        >
          {t("suzgecHepsi")}
        </Baglanti>
        {TALEP_DURUMLARI.map((d) => (
          <Baglanti
            key={d}
            href={adres(d, turSuzgeci)}
            className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm no-underline md:min-h-9 ${
              durumSuzgeci === d ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            }`}
          >
            {t(`durum${d}`)}
          </Baglanti>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Baglanti
          href={adres(durumSuzgeci, null)}
          className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm no-underline md:min-h-9 ${
            turSuzgeci === null ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
          }`}
        >
          {t("suzgecTumTurler")}
        </Baglanti>
        {TALEP_TURLERI.map((r) => (
          <Baglanti
            key={r}
            href={adres(durumSuzgeci, r)}
            className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm no-underline md:min-h-9 ${
              turSuzgeci === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            }`}
          >
            {t(`tur${r}`)}
          </Baglanti>
        ))}
      </div>

      <p className="text-muted-foreground text-sm">
        {t("sayac", { toplam: talepler.length, acik: acikSayisi })}
      </p>

      {talepler.length === 0 ? (
        /* AÇIK SIFIR: boş ekran bırakılmaz, NEDEN boş olduğu yazar. */
        <p className="text-muted-foreground py-8 text-center text-sm">
          {durumSuzgeci || turSuzgeci ? t("suzgecBos") : t("hicTalepYok")}
        </p>
      ) : (
        <div className="space-y-3">
          {talepler.map((x) => (
            <Card key={x.id} className="min-w-0">
              <CardHeader className="gap-2 pb-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <KopyalanabilirKod deger={x.kod} etiket={t("kodEtiketi")} />
                  <DurumRozeti durum={rozetDurumu(x.durum)} isaretsiz>
                    {t(`durum${x.durum}`)}
                  </DurumRozeti>
                  <DurumRozeti durum="notr" isaretsiz>
                    {t(`tur${x.tur}`)}
                  </DurumRozeti>
                  {/* FİRMA yalnız destek verene gösterilir: müşteri zaten
                      tek bir firmanın içinde, ona kendi adını yazmak
                      gürültü olurdu. */}
                  {firmaGoster ? (
                    <DurumRozeti durum="bilgi" isaretsiz>
                      {x.company.name}
                    </DurumRozeti>
                  ) : null}
                  <span className="text-muted-foreground text-xs">
                    {bicim.tarih(x.createdAt)} ·{" "}
                    {x.bildiren.name ?? x.bildiren.email}
                  </span>
                </div>
                <CardTitle className="text-base">{x.baslik}</CardTitle>
              </CardHeader>

              <CardContent className="min-w-0 space-y-3">
                <p className="text-sm whitespace-pre-wrap">{x.aciklama}</p>

                {/* YAKALANAN BAĞLAM GÖRÜNÜR — gizli toplama izlenimi yok. */}
                {x.rota || x.tarayici ? (
                  <details className="bg-muted/40 rounded-lg border px-3 py-2">
                    <summary className="cursor-pointer text-xs">
                      {t("baglamOzet")}
                    </summary>
                    {x.rota ? (
                      <p className="text-muted-foreground text-xs break-all">
                        {t("baglamSayfa")}:{" "}
                        <span className="font-mono">{x.rota}</span>
                      </p>
                    ) : null}
                    {x.tarayici ? (
                      <p className="text-muted-foreground text-xs break-all">
                        {t("baglamTarayici")}:{" "}
                        <span className="font-mono">{x.tarayici}</span>
                      </p>
                    ) : null}
                  </details>
                ) : null}

                {x.cozumNotu ? (
                  <div className={`rounded-lg p-3 ${DURUM_KUTUSU.olumlu}`}>
                    {/* KİM ve NE ZAMAN yazdı — Faz 2'de mesaj başlığı olacak
                        bilginin bugünkü karşılığı. Konuşmanın kimden geldiği
                        bilinmeden mesaj dizisi kurulamaz. */}
                    <p className="text-xs font-medium">
                      {t("cozumNotu")}
                      {x.cozumNotuYazan || x.cozumNotuZamani ? (
                        <span className="text-muted-foreground font-normal">
                          {" · "}
                          {x.cozumNotuYazan?.name ?? x.cozumNotuYazan?.email ?? ""}
                          {x.cozumNotuZamani
                            ? ` · ${bicim.tarih(x.cozumNotuZamani)}`
                            : ""}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{x.cozumNotu}</p>
                  </div>
                ) : null}

                {/* EKRAN GÖRÜNTÜSÜ — mevcut Attachment altyapısı, yeni tablo yok. */}
                <Ekler
                  hedefTipi="Talep"
                  hedefId={x.id}
                  ekler={eklerHaritasi.get(x.id) ?? []}
                  sinirMetni={ekSinirlari}
                />

                {/* Yetkisizde HİÇ çizilmez — pasif düğme bırakmıyoruz. */}
                {yonetebilir ? (
                  <DurumKontrolu talepId={x.id} mevcutDurum={x.durum} />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
