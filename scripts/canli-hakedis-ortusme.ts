/**
 * HAKEDİŞ ↔ SATIŞ ÖRTÜŞMESİ — "0 eşleşme" gecikmeden mi, eksik siparişten mi?
 * Salt okuma. (Anayasa: aynı olayı aynı zamanda mı görüyorlar?)
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const kalemler = await prisma.settlementItem.findMany({
    select: { orderNo: true, dueDate: true },
  });
  const satislar = await prisma.sale.findMany({ select: { code: true, soldAt: true } });

  const norm = (s: string | null) => (s ?? "").trim();
  const satisKodlari = new Set(satislar.map((s) => norm(s.code)));
  const siparisNolar = new Set(kalemler.map((k) => norm(k.orderNo)).filter(Boolean));

  console.log(`\nHAKEDIS <-> SATIS ORTUSMESI`);
  console.log(`  hakedis kalemi        ${kalemler.length}`);
  console.log(`  farkli siparis no     ${siparisNolar.size}`);
  console.log(`  sistemdeki satis      ${satisKodlari.size}`);
  const kesisim = [...siparisNolar].filter((n) => satisKodlari.has(n));
  console.log(`  KESISIM               ${kesisim.length}`);
  if (kesisim.length) console.log(`    ornek: ${kesisim.slice(0, 8).join(", ")}`);

  const bos = kalemler.filter((k) => !norm(k.orderNo)).length;
  const uz = new Map<number, number>();
  for (const n of siparisNolar) uz.set(n.length, (uz.get(n.length) ?? 0) + 1);
  const sUz = new Map<number, number>();
  for (const c of satisKodlari) sUz.set(c.length, (sUz.get(c.length) ?? 0) + 1);
  console.log(`\n  siparis no BOS olan kalem: ${bos}`);
  console.log(`  uzunluk (hakedis): ${[...uz].sort().map(([u, n]) => `${u}hane x${n}`).join(" | ")}`);
  console.log(`  uzunluk (satis):   ${[...sUz].sort().map(([u, n]) => `${u}hane x${n}`).join(" | ")}`);

  const tarihli = kalemler.map((k) => k.dueDate).filter(Boolean) as Date[];
  if (tarihli.length) {
    tarihli.sort((a, b) => a.getTime() - b.getTime());
    console.log(`\n  hakedis VADE tarihi: ${tarihli[0].toISOString().slice(0,10)} -> ${tarihli[tarihli.length-1].toISOString().slice(0,10)} (n=${tarihli.length})`);
  } else {
    console.log(`\n  UYARI: hicbir kalemde islem tarihi YOK.`);
  }
  const st = satislar.map((s) => s.soldAt).sort((a, b) => a.getTime() - b.getTime());
  console.log(`  satis ufku:           ${st[0]?.toISOString().slice(0,10)} -> ${st[st.length-1]?.toISOString().slice(0,10)} (n=${st.length})`);
}
main();
