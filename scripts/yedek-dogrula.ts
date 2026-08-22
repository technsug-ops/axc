/**
 * ============================================================================
 *  YEDEK VE GERİ YÜKLEME DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run yedek:dogrula
 *
 *  DÖRT BÖLÜM:
 *  1) KAPSAM BEKÇİSİ — şemadaki her model yedek listesinde mi?
 *     12.08.2026'da beş tablo (Supplier, Settlement, SettlementItem,
 *     Compensation, User) listeye eklenmemişti ve gece yedekleri aylardır
 *     eksik alınıyordu. Bu bölüm o hatayı bir daha sessiz bırakmaz.
 *  2) SIRA BEKÇİSİ — liste gerçekten bağımlılık sırasında mı?
 *  3) ÇÖZÜMLEME — bozuk/eski/yeni dosyalar doğru reddediliyor mu.
 *  4) GERÇEK TUR — YEREL veritabanında yedek al, boz, geri yükle, doğrula.
 *     Bu bölüm veritabanına YAZAR; yalnızca yerel adreste çalışır.
 * ============================================================================
 */

import "dotenv/config";
import { readFileSync } from "node:fs";

import {
  farkRaporu,
  onayGecerliMi,
  yedegiCoz,
  ONAY_METNI,
} from "../src/lib/geri-yukle";
import { geriYukle, mevcutSatirSayilari } from "../src/lib/geri-yukle-calistir";
import { prisma } from "../src/lib/prisma";
import {
  YEDEK_SURUMU,
  YEDEK_TABLOLARI,
  yedegiMetneCevir,
  yedekUret,
} from "../src/lib/yedek";

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

async function main() {
  // =========================================================================
  console.log("\n1) KAPSAM BEKÇİSİ — şemadaki her model yedekte mi");
  // =========================================================================
  {
    const sema = readFileSync("prisma/schema.prisma", "utf8");
    const modeller = [...sema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1]);
    const liste = YEDEK_TABLOLARI as readonly string[];

    const eksik = modeller.filter((m) => !liste.includes(m));
    kontrol(
      `şemadaki ${modeller.length} modelin hepsi yedek listesinde`,
      eksik.length === 0,
      eksik.length ? `EKSİK: ${eksik.join(", ")}` : undefined,
    );

    const fazla = liste.filter((t) => !modeller.includes(t));
    kontrol(
      "yedek listesinde şemada olmayan tablo yok",
      fazla.length === 0,
      fazla.length ? `FAZLA: ${fazla.join(", ")}` : undefined,
    );

    kontrol(
      "liste tekrarsız",
      new Set(liste).size === liste.length,
      `${liste.length} girdi, ${new Set(liste).size} benzersiz`,
    );
  }

  // =========================================================================
  console.log("\n1b) ÜRETİCİ BEKÇİSİ — listedeki tablo yedeğe YAZILIYOR mu");
  // =========================================================================
  {
    /**
     * ⚠ BU KONTROL 22.08.2026'DA EKLENDİ VE HEMEN GEREKLİ OLDUĞU GÖRÜLDÜ.
     *
     * Kapsam bekçisi (1) şemayı LİSTEYLE karşılaştırıyor. Ama yedeği üreten
     * kod bir DÖNGÜ DEĞİL, elle yazılmış bir nesne (`yedek.ts`): her tablo
     * için ayrı bir `findMany()` satırı var. Yani listeye tablo eklemek, o
     * tablonun dosyaya GİRDİĞİ anlamına gelmiyor.
     *
     * `KomisyonTarifesi` eklenirken tam bu tuzağa düşüldü: kapsam bekçisi
     * yeşile döndü, üretici hâlâ o tabloyu çekmiyordu. Liste ile üretici
     * ayrışabildiği sürece "yedek:dogrula geçti" cümlesi hiçbir şey
     * garanti etmez.
     */
    const uretici = readFileSync("src/lib/yedek.ts", "utf8");
    const bas = uretici.indexOf("const tablolar: Record<string, unknown[]> = {");
    const govde = uretici.slice(bas, uretici.indexOf("return {", bas));
    kontrol("üretici gövdesi bulundu", bas >= 0 && govde.length > 500, govde.length);

    const liste = YEDEK_TABLOLARI as readonly string[];
    const cekilmeyen = liste.filter(
      (t) => !new RegExp(`^\\s{4}${t}:`, "m").test(govde),
    );
    kontrol(
      "listedeki her tablo üreticide ÇEKİLİYOR",
      cekilmeyen.length === 0,
      cekilmeyen,
    );

    /** Ters yön: üreticide olup listede olmayan tablo geri yüklemede kaybolur. */
    const uretilenler = [...govde.matchAll(/^\s{4}([A-Z][A-Za-z]+):/gm)].map(
      (m) => m[1]!,
    );
    const listedeYok = uretilenler.filter((t) => !liste.includes(t));
    kontrol("üreticideki her tablo LİSTEDE var", listedeYok.length === 0, listedeYok);
  }

  // =========================================================================
  console.log("\n2) SIRA BEKÇİSİ — bağımlılık sırası doğru mu");
  // =========================================================================
  {
    const sema = readFileSync("prisma/schema.prisma", "utf8");
    const liste = YEDEK_TABLOLARI as readonly string[];
    const sira = new Map(liste.map((t, i) => [t, i]));

    const ihlaller: string[] = [];
    for (const model of liste) {
      const bas = sema.indexOf(`model ${model} {`);
      if (bas < 0) continue;
      const govde = sema.slice(bas, sema.indexOf("\n}", bas));

      for (const satir of govde.split("\n")) {
        // "alan Tip @relation(fields: [...])" — bu model ÖTEKİNE bağlıdır.
        const m = /^\s*\w+\s+(\w+)\??\s+@relation\(fields:/.exec(satir);
        if (!m) continue;
        const hedef = m[1];
        if (hedef === model) continue; // kendine bakan alan (stok defteri)
        const hedefSira = sira.get(hedef);
        if (hedefSira !== undefined && hedefSira > sira.get(model)!) {
          ihlaller.push(`${model} -> ${hedef} (hedef sonra geliyor)`);
        }
      }
    }
    kontrol(
      "bağlı olunan tablo her zaman ÖNCE geliyor",
      ihlaller.length === 0,
      ihlaller.length ? ihlaller.join(" · ") : undefined,
    );
  }

  // =========================================================================
  console.log("\n3) ÇÖZÜMLEME — bozuk dosya sessizce kabul edilmiyor");
  // =========================================================================
  {
    const bozuk = yedegiCoz("{ bu json değil");
    kontrol("JSON olmayan reddedilir", !bozuk.tamam && bozuk.hata.kod === "JSON_DEGIL");

    const yabanci = yedegiCoz(JSON.stringify({ bicim: "baska-program" }));
    kontrol("başka program dosyası reddedilir", !yabanci.tamam && yabanci.hata.kod === "YEDEK_DEGIL");

    const yeni = yedegiCoz(
      JSON.stringify({ bicim: "selliora-yedek", surum: YEDEK_SURUMU + 5, tablolar: {} }),
    );
    kontrol(
      "GELECEKTEN gelen sürüm reddedilir",
      !yeni.tamam && yeni.hata.kod === "SURUM_YENI",
      "yeni sürümü 'elimden geldiğince okurum' demek sessiz veri kaybıdır",
    );

    const tablosuz = yedegiCoz(JSON.stringify({ bicim: "selliora-yedek", surum: 2 }));
    kontrol("tablosuz dosya reddedilir", !tablosuz.tamam && tablosuz.hata.kod === "TABLO_YOK");

    const dizisiz = yedegiCoz(
      JSON.stringify({ bicim: "selliora-yedek", surum: 2, tablolar: { Sale: "olmaz" } }),
    );
    kontrol("dizi olmayan tablo reddedilir", !dizisiz.tamam && dizisiz.hata.kod === "TABLO_BOZUK");

    // ESKİ SÜRÜM KABUL EDİLİR ama eksikleri SAYILIR.
    const eski = yedegiCoz(
      JSON.stringify({
        bicim: "selliora-yedek",
        surum: 1,
        olusturulmaAni: "2026-08-10T00:00:00.000Z",
        tablolar: { Category: [{ id: "a" }], Sale: [] },
      }),
    );
    kontrol("eski sürüm OKUNUR", eski.tamam);
    if (eski.tamam) {
      const rapor = farkRaporu(eski.yedek, { Category: 1, Sale: 5, Supplier: 3 });
      kontrol(
        "dosyada olmayan tablolar sayıldı",
        rapor.eksikTablolar.includes("Supplier") && rapor.eksikTablolar.includes("User"),
        `${rapor.eksikTablolar.length} eksik tablo`,
      );
      kontrol("VERİ KAYBI uyarısı açık", rapor.kayipVar);
      const supplier = rapor.satirlar.find((s) => s.tablo === "Supplier")!;
      kontrol(
        "eksik tablo BOŞALACAK olarak raporlanır (3 -> 0)",
        supplier.mevcut === 3 && supplier.gelecek === 0 && supplier.dosyadaYok,
      );
    }

    // Kayıp yoksa uyarı da olmamalı — her seferinde kırmızı yanan uyarı
    // kısa sürede görünmez olur.
    const esit = yedegiCoz(
      JSON.stringify({
        bicim: "selliora-yedek",
        surum: YEDEK_SURUMU,
        tablolar: Object.fromEntries(YEDEK_TABLOLARI.map((t) => [t, [{ id: "x" }]])),
      }),
    );
    if (esit.tamam) {
      const r = farkRaporu(esit.yedek, Object.fromEntries(YEDEK_TABLOLARI.map((t) => [t, 1])));
      kontrol("birebir aynı veride kayıp uyarısı YOK", !r.kayipVar);
    }

    kontrol("onay metni doğru kabul edilir", onayGecerliMi(ONAY_METNI));
    kontrol("  ...boşluklu hâli de", onayGecerliMi("  GERİ  YÜKLE "));
    kontrol("yanlış metin reddedilir", !onayGecerliMi("geri"));
    kontrol("  ...boş metin reddedilir", !onayGecerliMi(""));
    kontrol("  ...noktalı i tuzağı: 'GERI YUKLE' reddedilir", !onayGecerliMi("GERI YUKLE"));
  }

  // =========================================================================
  console.log("\n4) GERÇEK TUR — yerel veritabanında yedek → boz → geri yükle");
  // =========================================================================
  {
    const adres = process.env.DATABASE_URL ?? "";
    const yerelMi = /@(localhost|127\.0\.0\.1|::1)[:/]/.test(adres);
    if (!yerelMi) {
      console.log("  ATLANDI — DATABASE_URL yerel değil. Bu bölüm veritabanına YAZAR.");
    } else {
      const oncekiSayimlar = await mevcutSatirSayilari();
      const yedek = await yedekUret(new Date(), true);

      // Dosyaya çevirip geri okumak ŞART: gerçek akışta veri JSON'dan
      // geçiyor ve Decimal/Date orada metne dönüyor. Bellekteki nesneyi
      // doğrudan yazmak, asıl riskli adımı atlamak olurdu.
      const cozum = yedegiCoz(yedegiMetneCevir(yedek));
      kontrol("üretilen yedek kendi çözümleyicisinden geçer", cozum.tamam);
      if (!cozum.tamam) return;

      const urunOnce = await prisma.product.count();
      const hareketOnce = await prisma.stockMovement.count();

      // Tur ÖNCESİ örnek değerler — sonra birebir karşılaştırılacak.
      // Değerin BİÇİMİNE değil KENDİSİNE bakılır: Decimal "151.8300"ü
      // "151.83" diye yazar, bu kayıp değildir; kayıp, sayının DEĞİŞMESİDİR.
      const ornekSatis = await prisma.sale.findFirst({
        where: { net1Amount: { not: null } },
        orderBy: { soldAt: "asc" },
      });
      const oncekiNet1 = ornekSatis?.net1Amount?.toString() ?? null;
      const oncekiTarih = ornekSatis?.soldAt.toISOString() ?? null;
      const oncekiMaliyet = (
        await prisma.stockMovement.findFirst({
          where: { unitCostAmount: { not: null } },
          orderBy: { occurredAt: "asc" },
        })
      )?.unitCostAmount?.toString() ?? null;

      // --- BOZ: bir ürün sil (ledger'a kadar zincirleme etkisi olsun) ---
      const kurban = await prisma.product.findFirst({ orderBy: { name: "asc" } });
      if (kurban) {
        await prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
          await tx.$executeRawUnsafe(`DELETE FROM \`Product\` WHERE id = ?`, kurban.id);
          await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
        });
      }
      const urunBozuk = await prisma.product.count();
      kontrol("bozma adımı gerçekten sildi", urunBozuk === urunOnce - (kurban ? 1 : 0), `${urunOnce} -> ${urunBozuk}`);

      // --- GERİ YÜKLE ---
      const sonuc = await geriYukle(cozum.yedek);
      kontrol(
        "geri yükleme başarılı",
        sonuc.tamam,
        sonuc.tamam ? `${sonuc.toplam} satır yazıldı` : JSON.stringify(sonuc.hata),
      );

      if (sonuc.tamam) {
        const sonrakiSayimlar = await mevcutSatirSayilari();
        const farklar: string[] = [];
        for (const tablo of YEDEK_TABLOLARI) {
          // Kargo tarifesi hariç tutulmuştu; o tablo boşalır, beklenen budur.
          if (tablo === "CargoTariff") continue;
          if (oncekiSayimlar[tablo] !== sonrakiSayimlar[tablo]) {
            farklar.push(`${tablo}: ${oncekiSayimlar[tablo]} -> ${sonrakiSayimlar[tablo]}`);
          }
        }
        kontrol(
          "bütün tablolar eski hâline döndü",
          farklar.length === 0,
          farklar.length ? farklar.join(" · ") : undefined,
        );
        kontrol("ürün sayısı geri geldi", (await prisma.product.count()) === urunOnce);
        kontrol("stok defteri bozulmadı", (await prisma.stockMovement.count()) === hareketOnce);

        // --- METİN TURUNDAN SAĞ ÇIKTI MI: aynı kayıt, aynı değer mi? ---
        if (ornekSatis) {
          const sonra = await prisma.sale.findUnique({
            where: { id: ornekSatis.id },
            select: { net1Amount: true, soldAt: true },
          });
          kontrol("örnek satış geri geldi", sonra !== null);
          kontrol(
            "NET-1 birebir aynı (kuruş kaybı yok)",
            (sonra?.net1Amount?.toString() ?? null) === oncekiNet1,
            `önce ${oncekiNet1} · sonra ${sonra?.net1Amount?.toString()}`,
          );
          kontrol(
            "satış tarihi birebir aynı (gün kaymadı)",
            (sonra?.soldAt.toISOString() ?? null) === oncekiTarih,
            `önce ${oncekiTarih} · sonra ${sonra?.soldAt.toISOString()}`,
          );
        }
        if (oncekiMaliyet !== null) {
          const sonraMaliyet = (
            await prisma.stockMovement.findFirst({
              where: { unitCostAmount: { not: null } },
              orderBy: { occurredAt: "asc" },
            })
          )?.unitCostAmount?.toString() ?? null;
          kontrol(
            "birim maliyet birebir aynı",
            sonraMaliyet === oncekiMaliyet,
            `önce ${oncekiMaliyet} · sonra ${sonraMaliyet}`,
          );
        }

        // Kargo tarifesi seed'den tamamlanacak: geri yükleme sonrası boş.
        kontrol(
          "hafif yedekte tarife tablosu boşaldı (beklenen)",
          (await prisma.cargoTariff.count()) === 0,
        );
        console.log("        NOT: tarifeleri geri getirmek için:  npx prisma db seed");
      }
    }
  }

  await prisma.$disconnect();

  console.log("\n" + "=".repeat(70));
  if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  else {
    console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
    process.exitCode = 1;
  }
  console.log("");
}

main().catch(async (e) => {
  console.error("BEKLENMEYEN HATA:", e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
