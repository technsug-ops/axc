"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, Clock, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBicim } from "@/lib/bicim-istemci";
import { sifiraYuvarlandi } from "@/lib/bicim-ortak";
import { karZararRengi, YAS_BANDI_RENGI } from "@/lib/durum-renkleri";
import { ciroMarji, ciroMarjiMetni, sermayeVerimi, sermayeVerimiMetni } from "@/lib/marj-gosterge";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import type { YasBandi } from "@/lib/yaslanma";
import {
  basabasFiyati,
  birAltDilim,
  mesafeHukmu,
  simulasyonKur,
  yonHukmu,
  yonRengi,
  type Beyan,
  type SimulasyonGirdisi,
} from "@/lib/fiyatlama/simulasyon";
import type { TarifeDilimi } from "@/lib/komisyon/tarife-okuyucu";

/**
 * ============================================================================
 *  FİYAT DENE — KÂRLILIK KARTI BÖLÜMÜ
 * ----------------------------------------------------------------------------
 *  Aşama 1'in kullanıcıya değen yüzü. Soru tek cümle: _bir dilim aşağı
 *  inmenin komisyon kazancı, fiyat kaybını telafi ediyor mu?_
 *
 *  ── ARAÇ İKİ YÖNÜ DE DÜRÜST GÖSTERİR ────────────────────────────────────
 *  ⚠ Mimar şartı 19.08.2026. Manuel Rondo kazandıran bir örnek ama HER
 *  ÜRÜN ÖYLE DEĞİL. Yalnız kazancı gösteren bir araç "her zaman in"
 *  aracı sanılır ve kullanıcı zarar eden bir indirimi güvenle yapar.
 *  Fark negatifse o da AYNI belirginlikte yazılır.
 *
 *  ── BEYANLAR EKRANDA YAŞAR ──────────────────────────────────────────────
 *  Motor "dilim verisi yok", "pencere bitti", "maliyet yok" diyor; bunlar
 *  ekranda görünmezse motorun dürüstlüğü kullanıcıya ulaşmaz.
 *  _"Kaydedilen ≠ görünen" dersinin hesap tarafındaki karşılığı._
 *
 *  ── HESAP İSTEMCİDE ─────────────────────────────────────────────────────
 *  Simülasyon saf ve veritabanına gitmiyor; zemin sunucudan bir kez
 *  geliyor, kullanıcı fiyatı değiştirdikçe hesap anında yeniden koşuyor.
 *  Her tuşta sunucuya gitmek, denemeyi ağır ve isteksiz kılardı.
 * ============================================================================
 */

export type ZeminGorunumu = {
  kanalAdi: string;
  dilimler: TarifeDilimi[] | null;
  pencereBitis: string | null;
  tekOran: number | null;
  komisyonKdvOrani: number | null;
  siparisKesintileri: SimulasyonGirdisi["siparisKesintileri"];
};

export function FiyatDene({
  zeminler,
  birimMaliyet,
  kdvOrani,
  paraBirimi,
  baslangicFiyati,
  eldekiAdet,
  yasGun,
  yasBandi,
  kayitsizKanallar,
}: {
  zeminler: ZeminGorunumu[];
  birimMaliyet: number | null;
  kdvOrani: number;
  paraBirimi: "TRY" | "EUR";
  /** Son satışın birim fiyatı — kutuya önceden yazılır, yoksa boş. */
  baslangicFiyati: number | null;
  /**
   * ---- ÇIKIŞ KARARININ İKİNCİ YARISI ----
   * Kullanıcı isteği 19.08.2026: "başabaşın yanında stokta ne kadar
   * beklediğini de yazsın ki kişi bu üründen çıkıp çıkmayacağına karar
   * versin."
   *
   * Başabaş "kaça satmalıyım"ı, bekleme "daha ne kadar bekleyebilirim"i
   * söyler; çıkış kararı ikisi YAN YANAYKEN veriliyor. Rakamlar kartın
   * üstündeki yaşlanma kutusuyla AYNI kaynaktan (`urun-karti-verisi`)
   * geliyor — burada ikinci bir yaş hesabı yok, olsaydı iki kutu aynı
   * ürün için farklı gün sayısı gösterebilirdi.
   */
  eldekiAdet: number;
  yasGun: number | null;
  yasBandi: YasBandi | null;
  /**
   * ⚠ HESAPLANAMAYAN KANALLAR — SESSİZ EKSİKLİĞİN BEYANI.
   * Kaydı olmayan kanal ekranda hiç görünmüyordu ve görünmemek "o kanalda
   * sorun yok" diye okunuyordu; oysa doğrusu "o kanal HESAPLANAMADI".
   */
  kayitsizKanallar: string[];
}) {
  const t = useTranslations("UrunKarti");
  const bicim = useBicim();
  const [fiyat, setFiyat] = useState(
    baslangicFiyati === null ? "" : String(baslangicFiyati),
  );

  /**
   * ⚠ HİÇ ZEMİN YOKKEN BÖLÜM KOMPLE KAYBOLUYORDU — sessiz kayıp.
   * Kullanıcı "Fiyat dene" diye bir şey olduğunu bile görmüyor, sebebini
   * hiç görmüyordu. Artık bölüm duruyor ve NEDEN boş olduğunu söylüyor.
   */
  const hicZeminYok = zeminler.length === 0;

  const sayi = Number(fiyat.replace(",", "."));
  const gecerli = fiyat.trim() !== "" && Number.isFinite(sayi) && sayi > 0;

  /**
   * ⚠ TÜKETİCİ EŞLEME — her beyan türü ADIYLA karşılanır.
   *
   * İlk yazılışta son dal "geri kalan her şey" idi: `PENCERE_BITTI` adı
   * hiç geçmiyordu. Yeni bir beyan türü eklendiğinde ekran onu SESSİZCE
   * "tarifenin geçerliliği bitti" diye yazardı — yanlış cümle, doğru
   * görünümle.
   *
   * Artık `switch` tüketici: yeni tür eklenince `asla` satırı TypeScript
   * hatası verir ve derleme durur. Ekran, motorun beyanlarıyla eşit
   * adımda kalmak ZORUNDA.
   */
  /**
   * ⚠ VARIŞ NOKTASI HER CÜMLEDE YAZILI. "Artar" tek başına yetmiyor:
   * kullanıcı nereye vardığını görmeden karar veremez. Beş hâl, beş
   * ayrı cümle — ve `switch` tüketici, yeni hâl eklenince derleme durur.
   */
  const hukumMetni = (h: ReturnType<typeof yonHukmu>): string => {
    const tutar = (d: number) => bicim.para(Math.abs(d), paraBirimi);
    switch (h.tur) {
      case "KARA_GECER":
        return t("yonKaraGecer", { fark: tutar(h.fark), sonuc: tutar(h.sonuc) });
      case "KAR_ARTAR":
        return t("yonKarArtar", { fark: tutar(h.fark), sonuc: tutar(h.sonuc) });
      case "ZARAR_AZALIR":
        return t("yonZararAzalir", { fark: tutar(h.fark), sonuc: tutar(h.sonuc) });
      case "ZARARA_GECER":
        return t("yonZararaGecer", { fark: tutar(h.fark), sonuc: tutar(h.sonuc) });
      case "KOTULESIR":
        return t("yonKotulesir", { fark: tutar(h.fark), sonuc: tutar(h.sonuc) });
      default: {
        const asla: never = h;
        return String(asla);
      }
    }
  };

  /**
   * ⚠ "EKSİ SIFIR" YAZILMAZ. Kuruşa yuvarlanınca sıfır olan ama tam sıfır
   * OLMAYAN tutar `−₺0,00` diye çıkıyordu (canlı bulgu 19.08.2026).
   * Yaklaşıklık işaretle söylenir; DEĞER değişmez, RENK gerçek işaretten
   * gelir — kırmızı "≈ ₺0,00" hâlâ zarar tarafında demektir.
   */
  const netMetni = (deger: number | null): string => {
    if (deger === null) return "—";
    if (sifiraYuvarlandi(deger)) return t("deneYaklasik", { tutar: bicim.para(0, paraBirimi) });
    return bicim.para(deger, paraBirimi);
  };

  const beyanMetni = (b: Beyan): string => {
    switch (b.tur) {
      case "DILIM_YOK":
        return t("beyanDilimYok");
      case "ORAN_YOK":
        return t("beyanOranYok");
      case "MALIYET_YOK":
        return t("beyanMaliyetYok");
      /**
       * ⚠ BU EKRANDA DOĞMAZ (fiyat her zaman girili) ama tip artık taşıyor:
       * `default` dalına düşürüp ham kod basmak, bir gün doğduğunda ekranda
       * "FIYAT_YOK" yazdırırdı.
       */
      case "FIYAT_YOK":
        return t("beyanFiyatYok");
      case "PENCERE_BITTI":
        return t("beyanPencereBitti", { tarih: bicim.tarih(b.bitis) });
      default: {
        const asla: never = b;
        return String(asla);
      }
    }
  };

  return (
    /*
      ═══ ÖNE ÇIKAN KART (K103-②, kullanıcı isteği 30.08.2026) ═══
      Bu blok kartın tek EYLEM yüzeyi — ötekiler okunur, burada bir şey
      DENENİR. Öteki bölümlerle birebir aynı görünmesi onu düz bir bilgi
      kutusu gibi gösteriyordu.

      ⚠ VURGU RENKLE DEĞİL YÜZEYLE YAPILIYOR: `bg-card` + `shadow-md`
      (yükselti) ve biraz daha yuvarlak köşe. Renk bu depoda ANLAM taşır
      (`lib/renkler.ts` → olumlu/olumsuz/uyarı) — buraya renk koymak
      olmayan bir hüküm iddia ederdi. Fiyat denemesi ne iyi ne kötü haber,
      sadece bir araç.

      ⚠ Ve `ring` yerine `shadow`: halka sınır çizgisiyle çakışıp kalın
      bir çerçeve izlenimi veriyordu.
    */
    /*
      ⚠ BAŞLIK BU KARTTAN ÇIKTI — BÖLÜM BAŞLIĞINA TERFİ ETTİ (30.08.2026).
      Kullanıcı: _"kartlarla hizala."_ Sol sütunun ilk şeyi bir BÖLÜM
      BAŞLIĞI ("Stok"), altında kutular; sağ sütunun ilk şeyi ise doğrudan
      KARTTI. Bu yüzden kartın üst kenarı soldaki başlığın hizasına düşüyor,
      kutularla hizalanmıyordu.

      ⛔ ÇARE SİHİRLİ BİR ÜST BOŞLUK DEĞİL (`pt-7` gibi): o sayı başlığın
      satır yüksekliğine kilitlenir ve yazı tipi değişince sessizce kayar.
      Başlık `<Bolum>`e taşındı — iki sütun artık AYNI yapıya sahip ve
      kartlar kendiliğinden hizalanıyor.
    */
    <div className="bg-card space-y-4 rounded-xl border p-4 shadow-md">
      <p className="text-muted-foreground text-sm">{t("fiyatDeneNot")}</p>

      <label className="block max-w-xs">
        <Label htmlFor="dene-fiyat">{t("fiyatDeneAlan")}</Label>
        <Input
          id="dene-fiyat"
          value={fiyat}
          /* MOBİL: sayısal klavye ve KURUŞ kabulü. Dilim sınırları kuruşla
             oynanıyor (769,98) — tam sayıya yuvarlayan bir alan aracın
             bütün anlamını yok ederdi. */
          inputMode="decimal"
          placeholder={t("fiyatDeneIpucu")}
          onChange={(e) => setFiyat(e.target.value)}
          className="h-11"
        />
      </label>

      {/* ---------- STOKTA BEKLEME — ÇIKIŞ KARARININ İKİNCİ YARISI ----------
          ⚠ KANAL KUTUSUNUN İÇİNE KONMADI. Yaş ürünün özelliği, kanalın
          değil: her kanal kutusunda tekrarlasaydık aynı rakam üç kez
          yazılır, ekran bilgi yerine gürültü taşırdı (Kural #12).
          Bir kez, başabaşların hepsinin üstünde duruyor.

          "Stok yok" AYRI BİR CÜMLE: sıfır adedi "0 gündür bekliyor" diye
          yazmak, elde mal varmış gibi okunurdu. */}
      {eldekiAdet > 0 && yasGun !== null && yasBandi !== null ? (
        <p
          className={`flex flex-wrap items-center gap-1.5 text-sm ${
            DURUM_YAZISI[YAS_BANDI_RENGI[yasBandi]]
          }`}
        >
          <Clock className="size-3.5 shrink-0" />
          {t("deneBekleme", { adet: eldekiAdet, gun: yasGun })}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">{t("deneStokYok")}</p>
      )}

      {hicZeminYok ? (
        <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
          {t("deneKanalKaydiHicYok")}
        </p>
      ) : null}

      {zeminler.map((z) => {
        const girdi: SimulasyonGirdisi = {
          hedefFiyat: gecerli ? sayi : 0,
          adet: 1,
          birimMaliyet,
          kdvOrani,
          paraBirimi,
          dilimler: z.dilimler,
          pencereBitis: z.pencereBitis === null ? null : new Date(z.pencereBitis),
          tekOran: z.tekOran,
          komisyonKdvOrani: z.komisyonKdvOrani,
          siparisKesintileri: z.siparisKesintileri,
          kargoTarifesi: null,
          bugun: new Date(),
        };

        const s = gecerli ? simulasyonKur(girdi) : null;

        /**
         * ---- BAŞABAŞ, KANAL BAŞINA ----
         * ⚠ HER PAZARYERİ İÇİN AYRI RAKAM — ve bu normaldir (kullanıcı
         * teyidi 19.08.2026). Komisyon oranı, komisyon KDV'si, sipariş
         * başına sabit kesintiler ve dilim yapısı kanaldan kanala
         * değişiyor; NET-2'yi sıfırlayan fiyat da doğal olarak değişir.
         * Tek bir "ürünün başabaşı" yazsaydık, hangi kanalın olduğu
         * belirsiz bir rakam gösterirdik.
         */
        const basabas = gecerli ? basabasFiyati(girdi) : null;

        /**
         * BİR ALT DİLİM — girilen fiyata göre. Kutu boşken hesaplanmaz:
         * hangi dilimde olduğumuz bilinmeden "bir alt" denemez.
         */
        const oneri =
          gecerli && z.dilimler !== null ? birAltDilim(z.dilimler, sayi) : null;
        const oneriSonuc =
          oneri === null
            ? null
            : simulasyonKur({ ...girdi, hedefFiyat: oneri.hedefFiyat });

        /**
         * ⚠ HÜKÜM YALNIZ FARKA BAKMAZ, VARIŞ NOKTASINA DA BAKAR.
         *
         * Canlı testte yanıldı: NET-2 zaten negatifken yeşil "ARTAR —
         * kazandırıyor" satırı "kâra geçer" diye okundu. Yön doğruydu,
         * varış noktası beyansızdı.
         */
        const hukum =
          s?.net2 != null && oneriSonuc?.net2 != null
            ? yonHukmu(s.net2, oneriSonuc.net2)
            : null;
        const renk = hukum === null ? null : yonRengi(hukum);

        return (
          <div key={z.kanalAdi} className="space-y-2 rounded-md border p-3">
            <div className="text-sm font-medium">{z.kanalAdi}</div>

            {s === null ? (
              <p className="text-muted-foreground text-sm">{t("fiyatDeneBekliyor")}</p>
            ) : (
              <>
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <span className="text-muted-foreground block text-xs">
                      {t("deneKomisyon")}
                    </span>
                    <span className="font-medium tabular-nums">
                      {s.komisyonOrani === null
                        ? "—"
                        : `%${s.komisyonOrani}`}
                      {s.dilim !== null ? (
                        <span className="text-muted-foreground ml-1 text-xs">
                          {t("deneDilim", { sira: s.dilim.sira })}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {/* ---------- KÂR YEŞİL, ZARAR KIRMIZI ----------
                      Eksi işareti tek karakter ve tabular-nums bir sütunda
                      göz onu atlıyor; renk uyarıyı rakamın KENDİSİNE
                      taşıyor. Eşik ekranda değil `karZararRengi`de —
                      ikinci ekran aynı rakamı farklı renkte göstermesin.

                      NET-2 daha büyük yazılıyor: karar veren rakam odur,
                      NET-1 ara duraktır. */}
                  <div>
                    <span className="text-muted-foreground block text-xs">NET-1</span>
                    <span
                      className={`font-medium tabular-nums ${DURUM_YAZISI[karZararRengi(s.net1)]}`}
                    >
                      {netMetni(s.net1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">NET-2</span>
                    <span
                      className={`text-base font-semibold tabular-nums ${DURUM_YAZISI[karZararRengi(s.net2)]}`}
                    >
                      {netMetni(s.net2)}
                    </span>
                    {/* ---------- KAZANÇ ORANI ----------
                        ⚠ Kullanıcı isteği 20.08.2026: "yalnız rakam
                        yanıltabilir". Haklı — ₺198,75 ile ₺251,59'u yan
                        yana koymak, ikisi FARKLI FİYATTAN çıkmışsa
                        yanıltır. Oran, rakamı ölçeğine bağlar.

                        İKİ ORAN DA VERİLİYOR ama ALT ALTA, yan yana
                        değil: ciro marjı "bu satıştan yüzde kaç kaldı",
                        sermaye verimi "bağladığım paraya göre ne
                        kazandım". İkisi farklı soruya cevap veriyor ve
                        kart zaten ikisini de kullanıyor. */}
                    <span className="text-muted-foreground block text-xs tabular-nums">
                      {ciroMarjiMetni(ciroMarji(s.net2, s.ciro)) ?? "—"}
                      {" · "}
                      {sermayeVerimiMetni(
                        sermayeVerimi(s.net2, birimMaliyet === null ? null : birimMaliyet * 1),
                      ) ?? "—"}
                    </span>
                  </div>
                </div>

                {/* ---------- BAŞABAŞ NOKTASI ----------
                    Ekranda NET-1 ₺0,04 / NET-2 −₺1,53 görünüyordu:
                    başabaş tam oradan geçiyordu ama araç söylemiyordu ve
                    kullanıcı deneme yanılmayla arıyordu.

                    Kök YOKSA SESSİZ KALINMAZ — dilimin tamamı kâr mı
                    zarar mı, o yazılır. */}
                {basabas !== null && basabas.fiyat !== null ? (
                  <p className="flex flex-wrap items-center gap-1 text-sm">
                    <Scale className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="tabular-nums font-medium">
                      {t("deneBasabas", {
                        fiyat: bicim.para(basabas.fiyat, paraBirimi),
                      })}
                    </span>
                  </p>
                ) : basabas !== null && basabas.dilimHep !== null ? (
                  <p
                    className={`flex flex-wrap items-center gap-1 text-sm ${
                      DURUM_YAZISI[basabas.dilimHep === "KAR" ? "olumlu" : "olumsuz"]
                    }`}
                  >
                    <Scale className="size-3.5 shrink-0" />
                    {basabas.dilimHep === "KAR"
                      ? t("deneBasabasHepKar")
                      : t("deneBasabasHepZarar")}
                  </p>
                ) : null}

                {/* ---------- BİR ALT DİLİM — YÖN DE SÖYLER ----------
                    ⚠ Araç iki yönü de dürüst gösterir. Yalnız kazancı
                    gösterseydi "her zaman in" aracı sanılırdı; oysa her
                    üründe inmek kazandırmıyor. */}
                {oneri !== null && oneriSonuc !== null ? (
                  <div
                    className={`rounded-md p-2 text-sm ${
                      renk === null ? "" : DURUM_KUTUSU[renk]
                    }`}
                  >
                    <p
                      className={`flex flex-wrap items-center gap-1 ${
                        renk === null ? "" : DURUM_YAZISI[renk]
                      }`}
                    >
                      <ArrowDown className="size-3.5 shrink-0" />
                      {t("deneAltDilim", {
                        fiyat: bicim.para(oneri.hedefFiyat, paraBirimi),
                        oran: oneri.dilim.oran,
                      })}
                    </p>
                    {/* ---------- SINIRA MESAFE ----------
                        ⚠ ÖNERİ GİZLENMİYOR, BÜYÜKLÜĞÜ YAZILIYOR. Eşik
                        koyup uzak öneriyi saklamak sessiz kayıp olurdu ve
                        kullanıcı o dilimin varlığını hiç öğrenemezdi;
                        üstelik uzak sınır bazen doğru hamledir. Yüzde,
                        soyut bir hedef fiyatı büyüklüğe çevirir. */}
                    {(() => {
                      const m = mesafeHukmu(sayi, oneri.hedefFiyat);
                      if (m === null) return null;
                      const pay = Math.round(m.pay * 100);
                      return (
                        <p
                          className={`text-xs ${m.uzak ? DURUM_YAZISI.uyari : "text-muted-foreground"}`}
                        >
                          {m.uzak
                            ? t("deneMesafeUzak", { pay })
                            : t("deneMesafe", { pay })}
                        </p>
                      );
                    })()}
                    {/* ---------- ORAN KAZANCI YOKSA SEBEBİ SÖYLENİR ----------
                        ⚠ CANLI BULGU 19.08.2026: stoklu 30 üründen 8'inde
                        alt dilimin oranı AYNI. Orada inmek komisyon
                        kazandırmıyor, yalnız ciro kaybettiriyor — ve bu
                        "kâr azaldı"dan FARKLI bir sebep. Yalnız kırmızı
                        rakam gösterseydik kullanıcı "neden azaldı" diye
                        düşünüp durur, dilim yapısına bakmayı akıl etmezdi. */}
                    {oneri.oranKazanci <= 0 ? (
                      <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                        {oneri.oranKazanci === 0
                          ? t("deneOranAyni", { oran: oneri.dilim.oran })
                          : t("deneOranYuksek")}
                      </p>
                    ) : null}
                    {hukum !== null && renk !== null ? (
                      <p className={`text-xs ${DURUM_YAZISI[renk]}`}>
                        {hukumMetni(hukum)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* BEYANLAR EKRANDA YAŞAR — motorun dürüstlüğü buraya
                    ulaşmazsa yok hükmündedir. */}
                {s.beyanlar.length > 0 ? (
                  <ul className={`space-y-0.5 text-xs ${DURUM_YAZISI.uyari}`}>
                    {s.beyanlar.map((b, i) => (
                      <li key={i}>{beyanMetni(b)}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        );
      })}

      {/* ---------- HESAPLANAMAYAN KANALLAR ----------
          Kutusu çıkmayan kanal, "sorunsuz" değil "hesaplanamadı"
          demektir. Sebebi ve çözümü tek cümlede yazıyor. */}
      {kayitsizKanallar.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          {t("deneKanalKaydiYok", { kanallar: kayitsizKanallar.join(" · ") })}
        </p>
      ) : null}

      {fiyat.trim() !== "" ? (
        <Button variant="ghost" size="sm" onClick={() => setFiyat("")}>
          {t("deneTemizle")}
        </Button>
      ) : null}
    </div>
  );
}
