import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { DurumRozeti } from "@/components/durum-rozeti";
import { bicimlendirici } from "@/lib/bicim";
import { donemRaporu } from "@/lib/donem-raporu";
import { DURUM_YAZISI, karDurumu } from "@/lib/renkler";
import { sayfaIzni } from "@/lib/yetki";

export async function generateMetadata() {
  const t = await getTranslations("Donem");
  return { title: t("raporBaslik") };
}

/**
 * ============================================================================
 *  DÖNEM RAPORU — MUHASEBECİYE VERİLECEK TEK SAYFA (K108, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ YENİ HESAP YOK. Bütün rakamlar `lib/donem-raporu.ts` gövdesinden ve o
 *  gövde de mevcut hesapları çağırıyor (envanter `envanterVerisi`, kesintiler
 *  defterdeki `SaleFee`, NET'ler satışın snapshot'ı). İkinci bir hesap yolu
 *  açılsaydı bu sayfa panelden farklı bir rakam gösterir ve hangisinin doğru
 *  olduğu sorulamazdı.
 *
 *  ── ⚠ HER RAKAM KAPSAMIYLA ─────────────────────────────────────────────
 *  Başlıkta "N satış üstünden" yazıyor. Kapsam yazılmadan bir para rakamı
 *  muhasebeye giden bir belgede kullanılamaz.
 *
 *  ── ⚠ AÇIK DÖNEM RAPORU KAPALI GİBİ GÖRÜNMEZ ───────────────────────────
 *  Kapanmamış bir dönemin rakamı DEĞİŞEBİLİR ve sayfa bunu üstte yazıyor.
 *  İkisi aynı görünseydi muhasebeci yarın değişecek bir rakamı beyan ederdi.
 *
 *  ── 🖨 PDF: TARAYICININ YAZDIRMASI ─────────────────────────────────────
 *  Ayrı bir PDF kütüphanesi EKLENMEDİ. Sayfa yazdırmaya hazır (tek sütun,
 *  dar genişlik) ve "PDF olarak kaydet" tarayıcının kendi işi. Kütüphane
 *  eklemek, aynı rakamları İKİNCİ bir yerde biçimlendirmek demekti — ve iki
 *  biçim bir gün ayrışır.
 * ============================================================================
 */
/**
 * Etiket + tutar — tek satır, ızgarada değil: belge OKUNACAK, taranmayacak.
 *
 * ⚠ MODÜL DÜZEYİNDE, RENDER İÇİNDE DEĞİL. İlk yazımda sayfa gövdesinin içine
 * konmuştu ve lint haklı olarak kırmızı yandı: render içinde tanımlanan bir
 * bileşen HER RENDER'DA yeniden yaratılır, kimliği değişir ve durumu sıfırlanır.
 * Bugün durumu yok ama yarın olursa hata sessiz olurdu.
 */
function Satir({
  etiket,
  deger,
  vurgu,
  not,
}: {
  etiket: string;
  deger: string;
  vurgu?: string;
  not?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <div>
        <div className="text-sm">{etiket}</div>
        {not ? <div className="text-muted-foreground text-xs">{not}</div> : null}
      </div>
      <div className={`shrink-0 font-medium tabular-nums ${vurgu ?? ""}`}>
        {deger}
      </div>
    </div>
  );
}

export default async function DonemRaporuSayfasi({
  params,
}: {
  params: Promise<{ donem: string }>;
}) {
  await sayfaIzni("rapor.gor");

  const { donem } = await params;
  const eslesme = /^(\d{4})-(\d{2})$/.exec(donem);
  if (!eslesme) notFound();

  const yil = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  if (ay < 1 || ay > 12) notFound();

  const t = await getTranslations("Donem");
  const bicim = await bicimlendirici();
  const r = await donemRaporu(yil, ay);
  const p = (n: number) => bicim.para(n, "TRY");
  const ayAdi = bicim.ayYil(new Date(Date.UTC(yil, ay - 1, 1)));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="print:hidden">
        <ListeyeDon href="/ayarlar/donemler">{t("baslik")}</ListeyeDon>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">
          {t("raporBasligi", { donem: ayAdi })}
        </h1>
        {/* ⭐ KAPSAM BAŞLIKTA — rakamlar bu kümenin üstünden. */}
        <p className="text-muted-foreground mt-1 text-sm">
          {t("kapsam", { sayi: r.satisSayisi })}
        </p>
        <div className="mt-2">
          <DurumRozeti durum={r.kapaliMi ? "olumsuz" : "olumlu"} isaretsiz>
            {r.kapaliMi ? t("durumKAPALI") : t("durumACIK")}
          </DurumRozeti>
        </div>
      </div>

      {/*
        ⚠ AÇIK DÖNEM ŞERHİ — kapalı raporla aynı görünmesin. Kapanmamış bir
        dönemin rakamı yarın değişebilir ve muhasebeci bunu bilmeden beyan
        edemez.
      */}
      {!r.kapaliMi ? (
        <p className="rounded-md border border-dashed p-3 text-sm">
          {t("acikDonemSerhi")}
        </p>
      ) : null}

      {/* ⚠ PARA KARIŞIKSA TEK RAKAM VERİLMEZ — söylenir. */}
      {r.paraKarisikMi ? (
        <p className="rounded-md border border-dashed p-3 text-sm">
          {t("paraKarisik")}
        </p>
      ) : null}

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">{t("bolumGelir")}</h2>
        <Satir etiket={t("ciro")} deger={p(r.ciro)} />
        <Satir
          etiket={t("iade")}
          deger={p(r.iadeTutari)}
          not={t("iadeAdedi", { sayi: r.iadeSayisi })}
        />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">{t("bolumKesinti")}</h2>
        {/*
          ⚠ KESİNTİ KODLARI DEFTERDEN GELİR — sabit bir liste YAZILMADI.
          Yarın yeni bir kesinti kalemi doğarsa (kanal yeni bir ücret keserse)
          bu bölüm onu KENDİLİĞİNDEN gösterir; sabit liste onu sessizce
          düşürürdü ve toplam tutmazdı.
        */}
        {r.kesintiler.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("kesintiYok")}</p>
        ) : (
          r.kesintiler.map((k) => (
            <Satir key={k.kod} etiket={t(`kesinti${k.kod}`)} deger={p(k.tutar)} />
          ))
        )}
        <Satir
          etiket={t("kesintiToplami")}
          deger={p(r.kesintiToplami)}
          vurgu="font-semibold"
        />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">{t("bolumKar")}</h2>
        <Satir
          etiket={t("net1")}
          deger={p(r.net1)}
          vurgu={DURUM_YAZISI[karDurumu(r.net1)]}
        />
        <Satir
          etiket={t("net2")}
          deger={p(r.net2)}
          vurgu={DURUM_YAZISI[karDurumu(r.net2)]}
          not={t("net2Notu")}
        />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">{t("bolumEnvanter")}</h2>
        <Satir
          etiket={t("envanterMalBedeli")}
          deger={p(r.envanterMalBedeli)}
          not={t("envanterNotu", { donem: ayAdi })}
        />
        {/* ⚠ TOPLAMA GİREMEYEN SATIR SESSİZ KALMAZ. */}
        {r.envanterKdvCozulemeyen > 0 ? (
          <p className={`mt-2 text-xs ${DURUM_YAZISI.uyari}`}>
            {t("envanterKdvSerhi", { sayi: r.envanterKdvCozulemeyen })}
          </p>
        ) : null}
      </section>

      {/*
        ═══ ŞERHLER — SESSİZ KALMAZ ═══
        ⚠ İKİSİ DE SIFIRSA BLOK ÇİZİLMEZ: "0 hesaplanamayan" yazmak, olmayan
        bir sorunu gündeme getirip belgeyi gürültüyle doldururdu.
      */}
      {r.hesaplanamayanSatis > 0 || r.uyariyaRagmen > 0 ? (
        <section
          className={`rounded-lg border p-4 text-sm ${DURUM_YAZISI.uyari}`}
        >
          <h2 className="mb-2 font-medium">{t("bolumSerh")}</h2>
          {r.hesaplanamayanSatis > 0 ? (
            <p>{t("hesaplanamayan", { sayi: r.hesaplanamayanSatis })}</p>
          ) : null}
          {/*
            ⭐ MUHASEBECİ BUNU BİLMELİ (kullanıcı şartı 31.08.2026):
            kapanmış döneme uyarıya rağmen yazılmış kayıt varsa, o dönemin
            rakamı beyan edildikten SONRA değişmiş olabilir.
          */}
          {r.uyariyaRagmen > 0 ? (
            <p>{t("uyariyaRagmen", { sayi: r.uyariyaRagmen })}</p>
          ) : null}
        </section>
      ) : null}

      <p className="text-muted-foreground text-xs">{t("raporNotu")}</p>
    </div>
  );
}
