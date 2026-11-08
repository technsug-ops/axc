import { readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

import { kaynakOku, hamOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  TANITIM VİTRİNİ BEKÇİSİ (K372, 07.11.2026)
 *      npm run tanitim:dogrula
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR — KORUDUĞU ŞEY GERİ ALINAMAZ. `tanitim/` herkese açık bir
 *  sitedir. Oraya bir gün GERÇEK bir ekran görüntüsü düşerse müşteri,
 *  tedarikçi, SKU, alış fiyatı ve kâr rakamı internete çıkar — ve arama
 *  motoru önbelleği yüzünden silmek geri getirmez. Bu, deponun bütün
 *  disiplininin var olma sebebi olan sınıftan bir hatadır.
 *
 *  ÖLÇÜT PROVENANS: `tanitim/gorsel/` bir AYNADIR. İçindeki her dosya
 *  `public/kitap-ekran/` içindeki eşinin BAYT BAYT aynısı olmak zorunda.
 *  O klasörü dolduran tek şey `npm run ekran:cek`tir ve o betik örnek
 *  veritabanına bağlı değilse çekim yapmayı REDDEDER. Yani eşitlik,
 *  görüntünün uydurma veriden geldiğinin kanıtıdır.
 *
 *  ⚠ "Gözle baktım, örnek veri görünüyor" bir ölçüm DEĞİLDİR: 1366×820'lik
 *  bir ekran görüntüsünde dört haneli bir SKU'yu gözden kaçırmak kolaydır.
 *  Ölçüt insana değil, dosyanın kendisine bağlandı.
 *
 *  ⚠ VİTRİNE AİT BAŞKA GÖRSEL (ekip fotoğrafı, çizim) `tanitim/gorsel/`e
 *  KONMAZ — ayna bozulur. Öyle bir ihtiyaç doğarsa `tanitim/resim/` açılır
 *  ve bu bekçi o klasöre karışmaz.
 *
 *  NE ÖLÇMEZ: sayfanın güzel olduğunu, metnin doğru olduğunu, sitenin
 *  yayımlandığını. Bunlar gerçek cihazda görülür (Halil testi).
 * ============================================================================
 */

const VITRIN = "tanitim";
const AYNA_KAYNAK = "public/kitap-ekran";
const AYNA_HEDEF = VITRIN + "/gorsel";
const SAYFA = VITRIN + "/index.html";

/**
 * ⛔ BÖLÜM SAYACI (anayasa: "ölçüt bloğu, özet ve çıkış kodundan ÖNCE
 * koşar"). Bir blok sıradan düşerse ya da erken dönülürse bekçi "geçti"
 * DEMEZ, GEÇERSİZ der. Sırayı doğru tutmak insan disiplinidir; bu sayaç
 * mekanizmadır.
 */
const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];

let kalan = 0;
const kontrol = (ad: string, kosul: boolean, ek = "") => {
  if (kosul) {
    console.log("  OK  " + ad);
  } else {
    console.log("  ⛔  " + ad + (ek ? "\n       " + ek : ""));
    kalan++;
  }
};

const ozet = (b: Buffer) => createHash("sha256").update(b).digest("hex").slice(0, 16);

console.log("");
console.log("TANITIM VİTRİNİ BEKÇİSİ");
console.log("");

/* ── ① AYNA: her görsel örnek veri hattından mı geldi ─────────────────── */
{
  const hedefler = existsSync(AYNA_HEDEF)
    ? readdirSync(AYNA_HEDEF).filter((d) => /\.(jpg|jpeg|png|webp)$/i.test(d))
    : [];

  /**
   * ⛔ TABAN DOLULUĞU AYRICA KANITLANIR (anayasa: `every` kapısı). Klasör
   * boşalırsa aşağıdaki döngü hiç dönmez ve bekçi "tüm kontroller geçti"
   * der — boş küme her koşulu sağlar. Sayı beyan edilir ve ölçülür.
   */
  kontrol(
    "ayna dolu (en az 10 görsel taranıyor)",
    hedefler.length >= 10,
    "tanitim/gorsel içinde " + hedefler.length + " görsel var; tarama boşsa ölçüt kendi kendini kandırır",
  );

  let ayrisan = 0;
  let yetim = 0;
  for (const ad of hedefler) {
    const kaynakYol = AYNA_KAYNAK + "/" + ad;
    if (!existsSync(kaynakYol)) {
      yetim++;
      console.log(
        "  ⛔  " + ad + " — `" + AYNA_KAYNAK + "` içinde EŞİ YOK",
      );
      console.log(
        "       vitrine elle konmuş bir görsel olabilir; örnek veri hattından geldiği KANITLANAMIYOR",
      );
      kalan++;
      continue;
    }
    const a = hamOku(kaynakYol);
    const b = hamOku(AYNA_HEDEF + "/" + ad);
    if (!a.equals(b)) {
      ayrisan++;
      console.log("  ⛔  " + ad + " — bayt bayt AYNI DEĞİL");
      console.log(
        "       kaynak " + ozet(a) + " ≠ vitrin " + ozet(b) +
          "   (ekran:cek yeniden koştuysa `cp public/kitap-ekran/*.jpg tanitim/gorsel/`)",
      );
      kalan++;
    }
  }
  kontrol(
    "her vitrin görseli örnek veri hattının birebir kopyası",
    ayrisan === 0 && yetim === 0,
  );

  kosanBolumler.push("ayna");
}

/* ── ② ÖLÜ BAĞLANTI: sayfanın gösterdiği her dosya var mı ─────────────── */
{
  const sayfa = kaynakOku(SAYFA);

  /**
   * Ölçüt KULLANIMA bağlanır, ada değil: `src="…"` ve `href="…"` içindeki
   * YEREL yollar. Dış adres (https://…), çapa (#…) ve posta (mailto:)
   * dosya değildir.
   */
  const yollar = [...sayfa.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((y) => !/^(https?:|mailto:|#|data:)/.test(y));

  kontrol(
    "sayfa yerel dosya gösteriyor (en az 12 yol)",
    yollar.length >= 12,
    "bulunan yol: " + yollar.length,
  );

  const eksik = yollar.filter((y) => !existsSync(VITRIN + "/" + y.split("?")[0]));
  kontrol(
    "gösterilen hiçbir dosya eksik değil",
    eksik.length === 0,
    eksik.length ? "bulunamayan: " + eksik.join(" · ") : "",
  );

  kosanBolumler.push("ölü bağlantı");
}

/* ── ③ BEYAN: "örnek veri" sözü sayfada DURUYOR mu ────────────────────── */
{
  const sayfa = kaynakOku(SAYFA);

  /**
   * ⛔ Bu bir SÖZDÜR, süs değil: okuyan kişiye rakamların gerçek defterden
   * olmadığını söylüyor. Cümle sessizce silinirse sayfa, örnek rakamları
   * gerçekmiş gibi sunmuş olur — ve kimse bir eksiklik görmez, çünkü
   * ekranda bir UYARI değil bir ONAY eksilir.
   *
   * Ölçüt YORUMSUZ gövdede aranır: dosya başındaki açıklama bloğu da
   * "örnek veri" diyor ve tek başına bu kontrolü ayakta tutardı.
   */
  const yorumsuz = sayfa.replace(/<!--[\s\S]*?-->/g, " ");

  const kahraman = yorumsuz.match(/<p class="kahraman-not">([\s\S]*?)<\/p>/);
  kontrol(
    "kahraman bölümünde «örnek veri» beyanı çiziliyor",
    !!kahraman && /örnek veri/i.test(kahraman[1]),
    "beyan `<p class=\"kahraman-not\">` içinde bulunamadı",
  );

  const galeri = yorumsuz.match(
    /<section id="ekranlar"[\s\S]*?<\/section>/,
  );
  kontrol(
    "ekranlar bölümünde de «gerçek defteri göstermez» deniyor",
    !!galeri && /gerçek defteri göstermez/i.test(galeri[0]),
  );

  kosanBolumler.push("beyan");
}

/* ── ÖZET ─────────────────────────────────────────────────────────────── */
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    "KOŞUM YARIM KALDI — sonuç GEÇERSİZ (" +
      kosanBolumler.length +
      "/" +
      BOLUM_SAYISI +
      " bölüm: " +
      kosanBolumler.join(" · ") +
      ")",
  );
  process.exit(1);
}

if (kalan === 0) {
  console.log("TÜM KONTROLLER GEÇTİ.");
} else {
  console.log(kalan + " kontrol DÜŞTÜ.");
  process.exitCode = 1;
}
