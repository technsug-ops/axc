import { betikAdresi } from "../src/lib/veritabani-adresi";
import type { TarifeDizinleri } from "../src/lib/komisyon/tarife-eslesme";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  BUYBOX FİYAT PENCERESİ — KOMİSYON ORANI NEREDEN GELİYOR (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — tek bir ürünün oran kaynağını ölçer,
 *  rutin koşmaz, hiçbir şey yazmaz.
 *
 *  ⛔ NİYE: kullanıcı 02.11.2026'da bildirdi — LEGO 76334'te «Fiyatla»
 *  penceresi komisyonu %9,1 hesaplıyor; Hepsiburada panelinde oran %18.
 *  Ekranın NE GÖSTERDİĞİ bir iddiadır; kanıtı gövdeyi ÇAĞIRMAKTIR.
 * ============================================================================
 */

const KANAL_SKU = process.argv[2] ?? "HBCV0000BGX0XP";
const FIYAT = Number(process.argv[3] ?? "2184.99");

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { simulasyonZeminleri } = await import("../src/lib/fiyatlama/kart-verisi");
  const { simulasyonKur } = await import("../src/lib/fiyatlama/simulasyon");
  const { dilimBul } = await import("../src/lib/komisyon/tarife-okuyucu");
  const { varyantinTarifeKalemleri } = await import("../src/lib/komisyon/tarife-eslesme-veri");

  console.log("\nBUYBOX KOMİSYON ORANI — KAYNAK ÖLÇÜMÜ");
  console.log("  kip  SALT OKUMA — hiçbir şey yazılmaz");
  console.log("  kanal SKU", KANAL_SKU, "· denenen fiyat", FIYAT);
  console.log("=".repeat(78));

  const esleme = await prisma.channelSku.findMany({
    where: { channelSku: KANAL_SKU },
    select: {
      channelSku: true,
      isActive: true,
      commissionRate: true,
      variantId: true,
      channelAccountId: true,
      channelAccount: { select: { name: true, satisIcin: true, channel: { select: { name: true } } } },
      variant: { select: { id: true, sku: true, name: true, barcode: true } },
    },
  });
  console.log("\n① KANAL KODU KAYITLARI:", esleme.length);
  for (const e of esleme) {
    console.log(
      `   ${e.channelAccount.channel.name} · ${e.channelAccount.name} · aktif=${e.isActive} · satisIcin=${e.channelAccount.satisIcin}`,
    );
    console.log(`     varyant ${e.variant.sku} — ${e.variant.name}`);
    console.log(`     barkod ${e.variant.barcode ?? "—"} · ChannelSku.commissionRate = ${e.commissionRate?.toString() ?? "null"}`);
  }
  if (esleme.length === 0) return;

  const variantId = esleme[0].variantId;
  const onbellek = new Map<string, TarifeDizinleri>();

  console.log("\n② BU VARYANTIN TARİFE PENCERELERİ (hesap bazında)");
  for (const e of esleme) {
    const pencereler = await prisma.komisyonTarifesi.findMany({
      where: {
        channelAccountId: e.channelAccountId,
        kalemler: { some: { OR: [{ variantId }, { variantId: null }] } },
      },
      orderBy: { pencereBaslangic: "desc" },
      select: { id: true, pencereBaslangic: true, pencereBitis: true, kaynakDosyaAdi: true, yuklendiAt: true },
    });
    console.log(`   ${e.channelAccount.channel.name} · ${e.channelAccount.name} — aday pencere: ${pencereler.length}`);
    for (const p of pencereler.slice(0, 5)) {
      const kalemler = await varyantinTarifeKalemleri(p.id, e.channelAccountId, variantId, onbellek);
      const ozet = kalemler
        .map((k) => `${k.dilimSirasi}:${k.altLimit?.toString() ?? "-"}..${k.ustLimit?.toString() ?? "-"}=%${k.oran.toString()}${k.variantId === null ? "(bağsız)" : ""}`)
        .join(" | ");
      console.log(
        `     ${p.pencereBaslangic.toISOString().slice(0, 10)} → ${p.pencereBitis?.toISOString().slice(0, 10) ?? "—"} · yüklendi ${p.yuklendiAt?.toISOString().slice(0, 16) ?? "—"} · kalem ${kalemler.length}`,
      );
      if (ozet) console.log(`       ${ozet}`);
    }
  }

  console.log("\n③ EKRANIN KENDİ GÖVDESİ — simulasyonZeminleri + simulasyonKur");
  const an = new Date();
  const zeminler = await simulasyonZeminleri(variantId, an);
  for (const z of zeminler) {
    const secilen = z.dilimler === null ? null : dilimBul(z.dilimler, FIYAT);
    const s = simulasyonKur({
      hedefFiyat: FIYAT,
      adet: 1,
      birimMaliyet: 1453,
      kdvOrani: 20,
      paraBirimi: "TRY",
      dilimler: z.dilimler,
      pencereBitis: z.pencereBitis,
      tekOran: z.tekOran,
      komisyonKdvOrani: z.komisyonKdvOrani,
      siparisKesintileri: z.siparisKesintileri,
      kargoTarifesi: null,
      bugun: an,
    });
    console.log(`   ${z.kanalAdi}`);
    console.log(`     dilim sayısı ${z.dilimler?.length ?? 0} · pencereBitis ${z.pencereBitis?.toISOString().slice(0, 10) ?? "—"} · tekOran ${z.tekOran ?? "—"}`);
    console.log(`     ${FIYAT} düştüğü dilim: ${secilen ? `sıra ${secilen.sira} · ${secilen.altLimit ?? "-"}..${secilen.ustLimit ?? "-"} → %${secilen.oran}` : "—"}`);
    console.log(`     SONUÇ oran %${s.komisyonOrani ?? "—"} (kaynak ${s.oranKaynagi}) · NET-2 ${s.net2?.toFixed(2) ?? "—"} · beyanlar ${s.beyanlar.map((b) => b.tur).join(",") || "yok"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
