import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarkaIkonu, MarkaYazisi } from "@/lib/marka/cizim";
import { UYGULAMA } from "@/lib/uygulama";

import stil from "./vitrin.module.css";

/**
 * ============================================================================
 *  TANITIM VİTRİNİ — `/info` (K374, 08.11.2026)
 * ----------------------------------------------------------------------------
 *  Dışarıya kendimizi anlatan, HERKESE AÇIK tek sayfa. Kapı `src/proxy.ts`
 *  → `ACIK_YOLLAR` içinde beyan edilir; varsayılan KAPALI olduğu için orada
 *  yazmadan bu sayfa giriş isterdi.
 *
 *  ⛔ NİYE UYGULAMANIN İÇİNDE (kullanıcı kararı 08.11.2026):
 *  _«bunu neden bezirganın ana sayfasında yapmıyoruz? www.bezirga/info»_
 *  Önce ayrı bir statik site + ayrı Vercel projesi olarak yayımlanmıştı
 *  (K372, `tanitim.bezirga.com`); kullanıcı tek alan adını seçti ve ayrı
 *  proje kaldırıldı. ⚠ BEDELİ BEYAN EDİLDİ: vitrin metni değişince artık
 *  ERP'nin tamamı yeniden yayımlanır (K355 — sık yayın, bağlantı kotası).
 *
 *  ⛔ EKRAN GÖRÜNTÜLERİ `public/kitap-ekran/` ALTINDAN, KOPYASI YOK.
 *  O klasörü dolduran tek şey `npm run ekran:cek`tir ve o betik örnek
 *  veritabanına bağlı değilse çekim yapmayı REDDEDER. Yani buradaki her
 *  görüntü uydurma veriden gelir — gerçek müşteri, tedarikçi, SKU ve kâr
 *  rakamı içermez. Gerçek defterin fotoğrafı buraya HİÇBİR KOŞULDA konmaz:
 *  arama motoru önbelleği yüzünden silmek geri getirmez.
 *
 *  ⛔ RAKAMLAR ÖLÇÜLDÜ, uydurulmadı:
 *     11  pazaryeri → prisma/seed.ts → CHANNELS            (06.11.2026)
 *     101 ekran     → find src/app -name page.tsx | wc -l  (06.11.2026)
 *     57  bölüm     → grep -c el-kitabi/icerik.ts          (06.11.2026)
 *     172 kontrol   → son push bekçi turu, 172/172 yeşil   (08.11.2026)
 *  Buraya yeni bir rakam yazan, önce onu ÖLÇER ve kaynağını bu bloğa yazar.
 *
 *  ⚠ İŞ HACMİ RAKAMI BİLEREK YOK (günlük paket, ciro, ürün adedi): gerçek
 *  iş verisidir ve kullanıcı onayı olmadan dışarı yazılmaz.
 *
 *  ⚠ METİNLER SÖZLÜKTEN (`messages/*.json` → `Tanitim`). Koda gömülü metin
 *  yasak; uygulama adı tek sabitten (`UYGULAMA.ad`), marka çizimi tek
 *  kaynaktan (`lib/marka/cizim`) gelir.
 * ============================================================================
 */

/** Ölçülen rakamlar — kaynakları yukarıdaki blokta satır satır yazılı. */
const RAKAMLAR = [
  { deger: "11", anahtar: "sistemRakam1" },
  { deger: "101", anahtar: "sistemRakam2" },
  { deger: "57", anahtar: "sistemRakam3" },
  { deger: "172", anahtar: "sistemRakam4" },
] as const;

/** Masaüstü ekran görüntüleri — dosyalar `public/kitap-ekran/` altında. */
const EKRANLAR = [
  { dosya: "satislar.jpg", ad: "Satislar" },
  { dosya: "urunler.jpg", ad: "Urunler" },
  { dosya: "stok.jpg", ad: "Stok" },
  { dosya: "alimlar.jpg", ad: "Alimlar" },
  { dosya: "rapor.jpg", ad: "Rapor" },
  { dosya: "envanter.jpg", ad: "Envanter" },
] as const;

/** Telefon görüntüleri — depo akışının birincil cihazı. */
const TELEFONLAR = [
  { dosya: "panel-telefon.jpg", sira: "1" },
  { dosya: "okut.jpg", sira: "2" },
  { dosya: "paketle.jpg", sira: "3" },
] as const;

const MENU = [
  { hedef: "#biz", anahtar: "menuBiz" },
  { hedef: "#sistem", anahtar: "menuSistem" },
  { hedef: "#ilkeler", anahtar: "menuIlkeler" },
  { hedef: "#ekranlar", anahtar: "menuEkranlar" },
  { hedef: "#kimlere", anahtar: "menuKimlere" },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Tanitim");
  /**
   * ⚠ BAŞLIK AYRI BİR ANAHTAR. İlk yazımda menü bağlantısı (`menuBiz`)
   * başlık olarak kullanılmıştı ve sekmede «Biz kimiz — Bezirga» yazıyordu —
   * ekrana bakılınca görüldü. Uygulama adını şablon ekliyor (`layout.tsx`).
   */
  return {
    title: t("sayfaBasligi"),
    description: t("sayfaAciklamasi"),
  };
}

export default async function TanitimSayfasi() {
  const t = await getTranslations("Tanitim");
  const ad = UYGULAMA.ad;

  return (
    <div className={stil.vitrin}>
      <header className={stil.ust}>
        <div className={stil.kap}>
          <a className={stil.marka} href="#" aria-label={ad}>
            <MarkaIkonu className={stil.ikon} />
            <MarkaYazisi className={stil.yazi} etiket={ad} />
          </a>

          <nav>
            {MENU.map((m) => (
              <a key={m.hedef} href={m.hedef}>
                {t(m.anahtar)}
              </a>
            ))}
            <a className={stil.dugme} href="#iletisim">
              {t("menuIletisim")}
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* ================= KAHRAMAN ================= */}
        <section className={stil.kahraman}>
          <div className={stil.kap}>
            <span className={stil.rozet}>
              <span className={stil.nokta} />
              {t("kahramanRozet")}
            </span>

            <h1>
              {t("kahramanBaslikOnce")}
              <em>{t("kahramanBaslikVurgu")}</em>
              {t("kahramanBaslikSonra")}
            </h1>

            <p className={stil["giris-metni"]}>{t("kahramanGiris", { ad })}</p>

            <div className={stil["kahraman-dugmeler"]}>
              <a
                className={`${stil.dugme} ${stil["dugme-asil"]}`}
                href="#ekranlar"
              >
                {t("kahramanDugmeGor")}
              </a>
              <a
                className={`${stil.dugme} ${stil["dugme-cizgi"]}`}
                href="#iletisim"
              >
                {t("kahramanDugmeUlas")}
              </a>
            </div>

            {/* ⚠ ÖRNEK VERİ BEYANI — kahramanda, yani ilk ekranda. */}
            <p className={stil["kahraman-not"]}>{t("kahramanNot")}</p>

            <div className={stil["kahraman-gorsel"]}>
              <img
                src="/kitap-ekran/panel.jpg"
                width={1366}
                height={820}
                alt={t("kahramanGorselAlt")}
              />
            </div>
          </div>
        </section>

        {/* ================= BİZ KİMİZ ================= */}
        <section id="biz">
          <div className={stil.kap}>
            <div className={stil["bolum-basi"]}>
              <span className={stil.etiket}>{t("bizEtiket")}</span>
              <h2>{t("bizBaslik")}</h2>
              <p>{t("bizMetin")}</p>
            </div>

            <div className={`${stil.izgara} ${stil["izgara-4"]}`}>
              {[1, 2, 3, 4].map((n) => (
                <article key={n} className={stil.kart}>
                  <h3>{t(`bizKart${n}Baslik`)}</h3>
                  <p>{t(`bizKart${n}Metin`, { ad })}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= SİSTEM ================= */}
        <section id="sistem" className={stil["alt-zemin"]}>
          <div className={stil.kap}>
            <div className={stil["bolum-basi"]}>
              <span className={stil.etiket}>{t("sistemEtiket")}</span>
              <h2>{t("sistemBaslik", { ad })}</h2>
              <p>{t("sistemMetin")}</p>
            </div>

            <div className={stil.rakamlar}>
              {RAKAMLAR.map((r) => (
                <div key={r.anahtar} className={stil.rakam}>
                  <b>{r.deger}</b>
                  <span>{t(r.anahtar)}</span>
                </div>
              ))}
            </div>

            <div
              className={`${stil.izgara} ${stil["izgara-3"]}`}
              style={{ marginTop: 28 }}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <article key={n} className={stil.kart}>
                  <h3>{t(`sistemKart${n}Baslik`)}</h3>
                  <p>{t(`sistemKart${n}Metin`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= İLKELER ================= */}
        <section id="ilkeler">
          <div className={stil.kap}>
            <div className={stil["bolum-basi"]}>
              <span className={stil.etiket}>{t("ilkelerEtiket")}</span>
              <h2>{t("ilkelerBaslik")}</h2>
              <p>{t("ilkelerMetin", { ad })}</p>
            </div>

            <div className={`${stil.izgara} ${stil["izgara-2"]}`}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className={stil.ilke}>
                  <h3>{t(`ilke${n}Baslik`)}</h3>
                  <p>{t(`ilke${n}Metin`)}</p>
                </div>
              ))}
            </div>

            <div className={stil.formul}>
              {t("formul1")}
              <br />
              <b>{t("formul2")}</b>
            </div>

            {/* ⚠ ELİMİZDE OLMAYAN ÖZELLİK VARMIŞ GİBİ ANLATILMAZ. */}
            <div className={stil.durustluk}>
              <h3>{t("durustlukBaslik")}</h3>
              <p>{t("durustlukMetin", { ad })}</p>
            </div>
          </div>
        </section>

        {/* ================= EKRANLAR ================= */}
        <section id="ekranlar" className={stil["alt-zemin"]}>
          <div className={stil.kap}>
            <div className={`${stil["bolum-basi"]} ${stil.orta}`}>
              <span className={stil.etiket}>{t("ekranlarEtiket")}</span>
              <h2>{t("ekranlarBaslik")}</h2>
              {/* ⚠ İKİNCİ BEYAN: galeri, gerçek defteri göstermediğini
                  kendi başlığında da söyler. */}
              <p>{t("ekranlarMetin")}</p>
            </div>

            <div className={`${stil.izgara} ${stil["izgara-2"]}`}>
              {EKRANLAR.map((e) => (
                <figure key={e.dosya} className={stil.ekran}>
                  {/* İlke #2 — tıklanabilir öğe tıklanabilir görünür. */}
                  <a
                    className={stil.buyut}
                    href={`/kitap-ekran/${e.dosya}`}
                    target="_blank"
                    rel="noopener"
                  >
                    <img
                      src={`/kitap-ekran/${e.dosya}`}
                      width={1366}
                      height={820}
                      alt={t(`ekran${e.ad}Alt`)}
                      loading="lazy"
                    />
                  </a>
                  <figcaption>
                    <b>{t(`ekran${e.ad}Baslik`)}</b>
                    {t(`ekran${e.ad}Metin`)}
                    <a
                      className={stil["tam-boy"]}
                      href={`/kitap-ekran/${e.dosya}`}
                      target="_blank"
                      rel="noopener"
                    >
                      {t("tamBoy")}
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div
              className={`${stil["bolum-basi"]} ${stil.orta}`}
              style={{ margin: "64px auto 32px" }}
            >
              <h2>{t("telefonBaslik")}</h2>
              <p>{t("telefonMetin")}</p>
            </div>

            <div className={stil.telefonlar}>
              {TELEFONLAR.map((f) => (
                <figure key={f.dosya} className={stil.telefon}>
                  <img
                    src={`/kitap-ekran/${f.dosya}`}
                    width={390}
                    height={844}
                    alt={t(`telefon${f.sira}Alt`)}
                    loading="lazy"
                  />
                  <p>{t(`telefon${f.sira}Metin`)}</p>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ================= KİMLERE ================= */}
        <section id="kimlere">
          <div className={stil.kap}>
            <div className={stil["bolum-basi"]}>
              <span className={stil.etiket}>{t("kimlereEtiket")}</span>
              <h2>{t("kimlereBaslik")}</h2>
              <p>{t("kimlereMetin")}</p>
            </div>

            <div className={`${stil.izgara} ${stil["izgara-2"]}`}>
              {[1, 2, 3, 4].map((n) => (
                <article key={n} className={stil.kitle}>
                  <span className={stil.kime}>{t(`kitle${n}Kime`)}</span>
                  <h3>{t(`kitle${n}Baslik`)}</h3>
                  <p>{t(`kitle${n}Metin`, { ad })}</p>
                  <ul>
                    {[1, 2, 3, 4].map((m) => (
                      <li key={m}>{t(`kitle${n}Madde${m}`)}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= İLETİŞİM ================= */}
        <section id="iletisim" className={stil.iletisim}>
          <div className={stil.kap}>
            <div className={`${stil["bolum-basi"]} ${stil.orta}`}>
              <h2>{t("iletisimBaslik")}</h2>
              <p>{t("iletisimMetin")}</p>
            </div>
            {/* ⚠ ADRES SÖZLÜKTEN DEĞİL KİMLİKTEN (`UYGULAMA.eposta`):
                markanın alan adını taşıyor, yani çevrilecek bir metin
                değil. Gerekçesi `lib/uygulama.ts`te. */}
            <a
              className={`${stil.dugme} ${stil["dugme-asil"]}`}
              href={`mailto:${UYGULAMA.eposta}`}
            >
              {UYGULAMA.eposta}
            </a>
          </div>
        </section>
      </main>

      <footer>
        <div className={stil.kap}>
          <span>{t("altbilgiMetin", { ad })}</span>
          <span>
            <a href="/giris">{t("altbilgiGiris")}</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
