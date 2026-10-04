import "dotenv/config";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  GİRİŞ FİRMASIZ ÇALIŞIR — BEKÇİ (K303, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run giris-firmasiz:dogrula
 *
 *  ⛔ VAKA: kaba kuvvet kilidi girişten ÖNCE `AuditLog`u süzgeçli istemciyle
 *  okuyordu; firma yokken süzgeç `FIRMA_BAGLAMI_YOK` ile durdu ve deneme
 *  kurulumunda giriş ekranı hiç açılmadı (hata 2371615829). HİÇBİR bekçi
 *  yakalamadı: girişi süzgeç altında koşan ölçüt yoktu.
 *
 *  GÖVDEYİ ÇAĞIRIR, DESEN ARAMAZ (anayasa: saf katman desen tarayan bekçiye
 *  muhtaç olmaz). Gerçek veritabanına KENDİNE ÖZGÜ işaretli, firmasız bir
 *  başarısız deneme izi yazar (izYaz'ın girişte yazdığı biçim), ölçer, sonunda
 *  SİLER ve silindiğini ölçer — veritabanında önceden iz olmasına bağlı değil.
 *
 *  İKİ YÖN:
 *   · yanlış susma — firmasız çağrı DÜŞMEZ; firma bağlamında bile firmasız izi
 *     GÖRÜR (süzgeç gizleseydi kilit hiç tutmazdı)
 *   · yanlış yanma — başka e-posta/IP'nin ya da pencere dışının izini SAYMAZ
 *  ve giriş eylemi gerçekten bu gövdeyi çağırır (bağ ölçütü).
 * ============================================================================
 */

console.log("\nGİRİŞ FİRMASIZ BEKÇİSİ\n");

const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];
let gecen = 0;
let hata = 0;
function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) { gecen++; console.log("  OK    " + ad); }
  else { hata++; console.log("  HATA  " + ad + (gorulen !== undefined ? `  (görülen: ${JSON.stringify(gorulen)})` : "")); }
}

/** Yalnız tam yorum satırları atılır — dize içindeki `//` korunur. */
function yorumsuz(kod: string): string {
  return kod
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((s) => !s.trim().startsWith("//"))
    .join("\n");
}

async function main() {
  const { sistemPrisma } = await import("../src/lib/prisma");
  const { firmaBaglamindaCalistir } = await import("../src/lib/firma-baglami");
  const { yakinBasarisizDenemeler } = await import("../src/lib/giris-kilidi-okuma");
  const { GIRIS_KILIT_DK } = await import("../src/lib/giris-kilidi");

  /* ① BAĞ — giriş eylemi gövdeyi çağırır, kendi sorgusunu kurmaz */
  const eylem = yorumsuz(kaynakOku("src/app/giris/actions.ts"));
  const bas = eylem.indexOf("export async function girisYap(");
  const son = eylem.indexOf("export async function cikisYap(");
  kontrol("girisYap ve cikisYap gövdeleri bulundu", bas >= 0 && son > bas, { bas, son });
  const govde = bas >= 0 && son > bas ? eylem.slice(bas, son) : "";
  kontrol("girisYap kilidi gövdeden besler: girisKilidi(await yakinBasarisizDenemeler(eposta, ip, simdi), simdi)",
    /girisKilidi\(\s*await yakinBasarisizDenemeler\(\s*eposta,\s*ip,\s*simdi\s*\),\s*simdi\s*\)/.test(govde));
  kontrol("girisYap AuditLog'u kendisi OKUMAZ (süzgeçli okuma geri dönemez)", !/\.auditLog\.find/.test(govde));
  kosanBolumler.push("bag");

  const isaret = `giris-firmasiz-bekci-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const eposta = `${isaret}@bekci.local`;
  const ip = `ip-${isaret}`;
  const an = new Date(Date.now() - 60_000);
  const sonra = new Date(an.getTime() + 1000);

  // SISTEM: bekçi girişin yazdığı firmasız izin aynısını kurar; firma yoktur.
  const iz = await sistemPrisma.auditLog.create({
    data: { action: "GIRIS_BASARISIZ", targetType: "User", targetId: null, userId: null, companyId: null,
      detail: JSON.stringify({ eposta, ip }), createdAt: an },
    select: { id: true, createdAt: true },
  });
  const icerir = (l: Date[]) => l.some((d) => d.getTime() === iz.createdAt.getTime());

  try {
    /* ② YANLIŞ SUSMA — firmasız ve firma bağlamında çağrı izi görür */
    let bagsiz: Date[] | string = "";
    try { bagsiz = await yakinBasarisizDenemeler(eposta, ip, sonra); } catch (e) { bagsiz = (e as Error).message.slice(0, 80); }
    kontrol("firma YOKKEN çağrı düşmez (girişten önceki an)", Array.isArray(bagsiz), bagsiz);
    kontrol("  ...ve firmasız izi görür", Array.isArray(bagsiz) && icerir(bagsiz));

    // SISTEM: firma bağlamı kurmak için herhangi bir firma seçilir.
    const firma = await sistemPrisma.company.findFirst({ select: { id: true } });
    kontrol("firma bağlamı kurulabildi (taban dolu)", firma !== null);
    if (firma) {
      let baglamli: Date[] | string = "";
      try { baglamli = await firmaBaglamindaCalistir(firma.id, () => yakinBasarisizDenemeler(eposta, ip, sonra)); }
      catch (e) { baglamli = (e as Error).message.slice(0, 80); }
      kontrol("firma bağlamı AÇIKKEN de firmasız izi görür (süzgeç gizlemez)", Array.isArray(baglamli) && icerir(baglamli), baglamli);
    }
    kosanBolumler.push("yanlis-susma");

    /* ③ EŞLEŞME — e-posta YA DA IP tek başına yeter */
    kontrol("yalnız e-posta eşleşince sayılır", icerir(await yakinBasarisizDenemeler(eposta, `ip-yok-${isaret}`, sonra)));
    kontrol("yalnız IP eşleşince sayılır", icerir(await yakinBasarisizDenemeler(`yok-${isaret}@bekci.local`, ip, sonra)));
    kosanBolumler.push("eslesme");

    /* ④ YANLIŞ YANMA — başkasının ya da pencere dışının izi sayılmaz */
    kontrol("başka e-posta + başka IP → izi SAYMAZ",
      !icerir(await yakinBasarisizDenemeler(`yok-${isaret}@bekci.local`, `ip-yok-${isaret}`, sonra)));
    const pencereSonrasi = new Date(an.getTime() + GIRIS_KILIT_DK * 60_000 + 1000);
    kontrol(`${GIRIS_KILIT_DK} dk penceresi geçince izi SAYMAZ`, !icerir(await yakinBasarisizDenemeler(eposta, ip, pencereSonrasi)));
    kontrol("izden ÖNCEKİ an için izi SAYMAZ", !icerir(await yakinBasarisizDenemeler(eposta, ip, new Date(an.getTime() - 1000))));
    kosanBolumler.push("yanlis-yanma");
  } finally {
    // SISTEM: bekçinin kendi yazdığı tek iz, kimliğiyle silinir.
    await sistemPrisma.auditLog.delete({ where: { id: iz.id } });
    const kalan = await sistemPrisma.auditLog.count({ where: { detail: { contains: isaret } } });
    kontrol("bekçinin izi geri alındı (kalan 0)", kalan === 0, kalan);
    await sistemPrisma.$disconnect();
  }

  if (kosanBolumler.length !== BOLUM_SAYISI) {
    console.log(`\n  KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ\n`);
    process.exit(1);
  }
  if (hata === 0) console.log(`\nTÜM KONTROLLER GEÇTİ (${gecen}/${gecen})\n`);
  else { console.log(`\n${hata} KONTROL BAŞARISIZ (${gecen}/${gecen + hata})\n`); process.exitCode = 1; }
}

main().catch((e) => { console.error("\nBEKÇİ ÇÖKTÜ:", e); process.exit(1); });
