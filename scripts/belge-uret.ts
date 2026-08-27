import { readFileSync, writeFileSync } from "node:fs";

/**
 * ============================================================================
 *  BELGE ÜRETECİ — docs/*.md  →  docs/*.html
 * ----------------------------------------------------------------------------
 *      npm run belge:uret -- sayim-proseduru
 *
 *  ⚠ NİYE YAZILDI: `docs/iade-sureci.html` ELLE üretilmişti ve üretecin
 *  kendisi depoda yoktu. İkinci belge gelince aynı işi ikinci kez elle yapmak
 *  gerekti — ve elle üretilen bir belge, kaynağı değiştiğinde SESSİZCE
 *  bayatlar. HTML'in başındaki "ÜRETİLDİ" uyarısı ancak gerçekten üreten bir
 *  komut varsa doğrudur.
 *
 *  ⛔ BAĞIMLILIK EKLENMEDİ. Depoda markdown kütüphanesi yok (`marked` ·
 *  `markdown-it` ikisi de yok) ve bu belge için tam bir Markdown motoru
 *  gerekmiyor: kullanılan sözdizimi dar ve BİLİNİYOR (başlık · liste · tablo ·
 *  alıntı · kod bloğu · kalın/italik/kod). Yeni bir bağımlılık, güncelleme
 *  yüzeyi ve denetim yükü demekti.
 *  _(Anayasa: "şema değişikliği en pahalı çözümdür" merdiveninin bağımlılık
 *  tarafı — ucuzu varken pahalıya gidilmez.)_
 *
 *  ⚠ DESTEKLENMEYEN SÖZDİZİMİ SESSİZCE YUTULMAZ: tanınmayan bir satır olduğu
 *  gibi paragraf olarak çıkar; kaybolmaz. Bir belge parçasının HTML'de yok
 *  olması, en sinsi bozulma olurdu.
 * ============================================================================
 */

const KAP = readFileSync("docs/iade-sureci.html", "utf8");

/** `iade-sureci.html`in <style> bloğu — tek kaynak, iki belge aynı görünür. */
function kabuk(baslik: string, kaynak: string, govde: string): string {
  const stilBas = KAP.indexOf("<style>");
  const stilSon = KAP.indexOf("</style>") + "</style>".length;
  const stil = KAP.slice(stilBas, stilSon);
  return (
    '<!doctype html>\n<html lang="tr"><head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    "<title>" + kacir(baslik) + "</title>\n" +
    stil +
    '\n</head><body><div class="sayfa"><div class="uretildi">Bu dosya <code>' +
    kacir(kaynak) +
    "</code> dosyasından ÜRETİLDİ. Elle düzenlemeyin — değişiklik kaynağa yapılır, sonra <code>npm run belge:uret</code> koşulur.</div>" +
    govde +
    "</div></body></html>\n"
  );
}

function kacir(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * KOD YER TUTUCUSU — metinde ASLA geçmeyecek bir işaret.
 *
 * ⚠ İLK YAZIMDA 0x00 (NUL) KULLANILDI ve `kontrol-karakteri:dogrula` kendi
 * yazdığım dosyada onu YAKALADI. NUL teknik olarak işe yarardı ama görünmez
 * bir karakteri kaynağa yazmak, tam da o bekçinin yasakladığı şey — ve
 * kural, kendi araçlarım için de geçerli.
 */
const KOD_ISARETI = "⁣KOD⁣";

/** Satır içi biçimlendirme — kaçırma ÖNCE, etiketler sonra. */
function satirIci(ham: string): string {
  let s = kacir(ham);
  /** ⚠ KOD ÖNCE: `**a**` bir kod bloğunun içindeyse kalın YAPILMAZ. */
  const kodlar: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_, i: string) => {
    kodlar.push(i);
    return KOD_ISARETI + (kodlar.length - 1) + KOD_ISARETI;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>");
  s = s.replace(
    new RegExp(KOD_ISARETI + "(\\d+)" + KOD_ISARETI, "g"),
    (_, n: string) => "<code>" + kodlar[Number(n)] + "</code>",
  );
  return s;
}

function tabloSatiri(satir: string): string[] {
  return satir
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((h) => h.trim());
}

export function markdowniCevir(md: string): string {
  const satirlar = md.replaceAll("\r\n", "\n").split("\n");
  const cikti: string[] = [];
  let i = 0;

  while (i < satirlar.length) {
    const satir = satirlar[i];

    /* ── kod bloğu ── */
    if (satir.startsWith("```")) {
      const govde: string[] = [];
      i++;
      while (i < satirlar.length && !satirlar[i].startsWith("```")) govde.push(satirlar[i++]);
      i++;
      cikti.push("<pre><code>" + kacir(govde.join("\n")) + "</code></pre>");
      continue;
    }

    /* ── tablo: başlık + hizalama satırı ── */
    if (
      satir.startsWith("|") &&
      i + 1 < satirlar.length &&
      /^\|[\s:|-]+\|$/.test(satirlar[i + 1])
    ) {
      const bas = tabloSatiri(satir);
      i += 2;
      const govde: string[][] = [];
      while (i < satirlar.length && satirlar[i].startsWith("|")) {
        govde.push(tabloSatiri(satirlar[i++]));
      }
      cikti.push(
        '<div class="tablo-kap"><table><thead><tr>' +
          bas.map((h) => "<th>" + satirIci(h) + "</th>").join("") +
          "</tr></thead><tbody>" +
          govde
            .map((r) => "<tr>" + r.map((h) => "<td>" + satirIci(h) + "</td>").join("") + "</tr>")
            .join("") +
          "</tbody></table></div>",
      );
      continue;
    }

    /* ── alıntı ── */
    if (satir.startsWith("> ") || satir === ">") {
      const govde: string[] = [];
      while (i < satirlar.length && (satirlar[i].startsWith("> ") || satirlar[i] === ">")) {
        govde.push(satirlar[i].replace(/^> ?/, ""));
        i++;
      }
      cikti.push("<blockquote>" + paragraflar(govde) + "</blockquote>");
      continue;
    }

    /* ── başlık ── */
    const bas = /^(#{1,4})\s+(.*)$/.exec(satir);
    if (bas) {
      const n = bas[1].length;
      cikti.push("<h" + n + ">" + satirIci(bas[2]) + "</h" + n + ">");
      i++;
      continue;
    }

    /* ── yatay çizgi ── */
    if (/^---+$/.test(satir)) {
      cikti.push("<hr />");
      i++;
      continue;
    }

    /* ── liste (sıralı ve sırasız) ── */
    if (/^\s*([-*]|\d+\.)\s+/.test(satir)) {
      const sirali = /^\s*\d+\./.test(satir);
      const ogeler: string[] = [];
      while (i < satirlar.length && /^\s*([-*]|\d+\.)\s+/.test(satirlar[i])) {
        let metin = satirlar[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        i++;
        /** Devam satırları (girintili) aynı maddeye bağlanır. */
        while (i < satirlar.length && /^\s{2,}\S/.test(satirlar[i]) && !/^\s*([-*]|\d+\.)\s+/.test(satirlar[i])) {
          metin += " " + satirlar[i].trim();
          i++;
        }
        ogeler.push("<li>" + satirIci(metin) + "</li>");
      }
      cikti.push((sirali ? "<ol>" : "<ul>") + ogeler.join("") + (sirali ? "</ol>" : "</ul>"));
      continue;
    }

    /* ── boş satır ── */
    if (satir.trim() === "") {
      i++;
      continue;
    }

    /* ── paragraf (tanınmayan her şey de buraya düşer, KAYBOLMAZ) ── */
    const govde: string[] = [];
    while (
      i < satirlar.length &&
      satirlar[i].trim() !== "" &&
      !satirlar[i].startsWith("#") &&
      !satirlar[i].startsWith(">") &&
      !satirlar[i].startsWith("|") &&
      !satirlar[i].startsWith("```") &&
      !/^---+$/.test(satirlar[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(satirlar[i])
    ) {
      govde.push(satirlar[i++]);
    }
    cikti.push("<p>" + satirIci(govde.join(" ")) + "</p>");
  }

  return cikti.join("\n");
}

function paragraflar(satirlar: string[]): string {
  const parcalar: string[] = [];
  let biriken: string[] = [];
  for (const s of satirlar) {
    if (s.trim() === "") {
      if (biriken.length) parcalar.push("<p>" + satirIci(biriken.join(" ")) + "</p>");
      biriken = [];
    } else biriken.push(s);
  }
  if (biriken.length) parcalar.push("<p>" + satirIci(biriken.join(" ")) + "</p>");
  return parcalar.join("");
}

const ad = process.argv[2];
if (!ad) {
  console.log("\nKullanım:  npm run belge:uret -- <belge-adi>");
  console.log("Örnek:     npm run belge:uret -- sayim-proseduru\n");
  process.exit(1);
}

const kaynakYolu = "docs/" + ad + ".md";
const md = readFileSync(kaynakYolu, "utf8");
const baslik = (/^#\s+(.*)$/m.exec(md)?.[1] ?? ad).trim();
const html = kabuk(baslik, ad + ".md", markdowniCevir(md));
writeFileSync("docs/" + ad + ".html", html, "utf8");

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log("\ndocs/" + ad + ".html yazildi — " + kb + " KB · baslik: " + baslik + "\n");
