import { betikAdresi } from "./src/lib/veritabani-adresi";
import { canliYapilandirma } from "./scripts/canli-ortak";
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) return console.log("yapılandırma yok");
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("./src/lib/prisma");
  const [gider, kart, konum] = await Promise.all([
    prisma.expense.count(),
    prisma.creditCard.count({ where: { isActive: true } }),
    prisma.location.count({ where: { isActive: true } }),
  ]);
  console.log(`gider ${gider} · aktif kart ${kart} · aktif raf ${konum}`);
}
main().catch((e) => console.log("HATA:", String(e).slice(0, 120)));
