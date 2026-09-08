import { get } from "@vercel/blob";

import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K119 — BLOB ASKISI ÇÖZÜLDÜ MÜ? (ÖLÇÜM, SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:blob-olcum
 *
 *  BETIK SINIFI: SUREKLI — rutin koşabilir. Hiçbir yere YAZMAZ, SİLMEZ.
 *
 *  ⚠ ÜÇ ADIM AYRI ÖLÇÜLÜR ÇÜNKÜ ÜÇÜ AYRI ŞEY SÖYLÜYOR:
 *  ① listeleme çalışıyor mu (31.08'de bu ÇALIŞIYORDU ve yanıltmıştı)
 *  ② `yedek-hedefi.oku()`nun bugün kullandığı DÜZ FETCH ne diyor
 *  ③ `api/yedek/indir`in kullandığı `get(access:"private")` ne diyor
 *
 *  ②/③ ayrımı vakanın kendisi olabilir: dosyalar `access:"private"` yazılıyor
 *  ve özel bir blob'un URL'sine jetonsuz `fetch` atmak TASARIM GEREĞİ 403
 *  verir. Bu durumda 403'ün sebebi "depo askıda" değil, okuma yolunun yanlış
 *  olmasıdır — ikisi ekranda aynı görünür.
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir" — burada iki farklı 403 ayırt ediliyor.)_
 * ============================================================================
 */

async function main() {
  /**
   * ⚠ JETON TEK KAYNAKTAN: `.env.canli`yi okuyan her betik `canli-ortak`tan
   * geçer. İkinci bir okuma mantığı yazsaydım biri güncellenip öteki
   * unutulurdu. _(Anayasa: "iki yerde iki ölçüt olmaz".)_
   */
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("⛔ Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const jeton = y.veri.blobJetonu ?? undefined;
  /** ⛔ DEĞER ASLA YAZILMAZ — yalnız VARLIK ve uzunluk. */
  console.log(`jeton: ${jeton ? "VAR (uzunluk " + jeton.length + ")" : "YOK"}`);
  if (!jeton) {
    console.log("   (jeton yok — ölçüm yapılamaz, bu da bir bulgudur)");
    return;
  }

  /**
   * ⛔ `list()` KULLANILMIYOR (K192, 08.09.2026) — VE BU BETİĞİN KENDİSİ DE
   * SUÇLUYDU. Askının sebebi ölçüldü: advanced operations **2000/2000**.
   * Her koşumda bir `list()` atan bir TEŞHİS aracı, teşhis ettiği arızayı
   * besler. Kayıtlar artık manifestten (`get`) okunuyor.
   */
  let kayitlar: { ad: string; boyut: number; yazildi: Date }[] = [];
  try {
    const { blobHedefi } = await import("../src/lib/yedek-hedefi");
    kayitlar = await blobHedefi(jeton).listele("yedek/");
    console.log(`① MANIFEST  ✓  ${kayitlar.length} kayit`);
  } catch (e) {
    console.log(`① MANIFEST  ⛔ ${String((e as Error).message).replace(/\s+/g, " ")}`);
    process.exitCode = 1;
    return;
  }
  if (kayitlar.length === 0) {
    console.log("   (manifest BOS — henuz hic yedek yazilmamis ya da manifest yok)");
    return;
  }

  const yeni = [...kayitlar].sort(
    (a, b) => b.yazildi.getTime() - a.yazildi.getTime(),
  )[0];
  console.log(
    `   en yeni: ${yeni.ad} · ${(yeni.boyut / 1024 / 1024).toFixed(2)} MB · ${yeni.yazildi.toISOString()}`,
  );

  try {
    const s = await get(yeni.ad, { access: "private", token: jeton });
    if (!s) {
      console.log("③ get(private)  ⛔ null dondu (bulunamadi)");
    } else {
      console.log(`③ get(private)  → statusCode ${s.statusCode} ${s.statusCode === 200 ? "✓" : "⛔"}`);
      if (s.statusCode === 200) {
        const metin = await new Response(s.stream).text();
        console.log(`   icerik okundu: ${metin.length} karakter · ilk 60: ${JSON.stringify(metin.slice(0, 60))}`);
      }
    }
  } catch (e) {
    console.log(`③ get(private)  ⛔ ${String((e as Error).message).replace(/\s+/g, " ")}`);
  }
}

main();
