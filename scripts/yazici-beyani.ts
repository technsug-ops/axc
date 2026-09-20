/**
 * ============================================================================
 *  YAZICI BEYANI — TEK GÖVDE (K223-③, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  Bu liste İKİ yerden okunur ve bilerek TEK yerde durur:
 *   · `api-dogrula.ts`         — "yazan betik beyanlı mı, bekçisi kayıtlı mı"
 *   · `hakedis-yazici-dogrula.ts` — kendi koruduğu KÜMEYİ buradan TÜRETİR
 *
 *  ⛔ NİYE TAŞINDI: `hakedis-yazici-dogrula.ts` korunacak dosyaları ELLE
 *  tutuyordu (`const DOSYALAR = [...]`). Elle tutulan liste yeni üyeyi
 *  SESSİZCE korumasız bırakır — bekçi yeşil yanar, korunması gereken betik
 *  kapsam dışındadır ve bunu kimse göremez. Küme artık beyandan türetiliyor:
 *  `bekcisi` alanına bu bekçiyi yazan her betik kendiliğinden kapsama girer.
 *  _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
 *
 *  ⛔ LİSTEYE GİRMEK BİR MUAFİYET DEĞİL, BİR TAAHHÜTTÜR: beyan edilen betik
 *  kendi bekçisini taşımak zorunda. Beyan, denetimsizlik demek değildir.
 * ============================================================================
 */

/**
 * ═══ YAZAN BETİK ADIYLA BEYAN EDİLİR — SUSTURULMAZ ═══════════════════════
 *
 * ⚠ 26.08.2026'da bu kontrol KIRMIZI yandı ve **kod doğruydu**: A3-③ içe
 * aktarması onaylı bir YAZICI. Bekçinin kırmızısı burada _"kod yanlış"_
 * değil _"ölçütüm eskidi"_ diyordu — API'ye ulaşan her betiğin ölçüm
 * betiği olduğu varsayımı, ilk yazıcı doğduğu gün düştü.
 *
 * ⚠ SUSTURULMADI, DARALTILDI. Kontrolü silmek ya da beklentiyi gevşetmek
 * ölçmeyi bırakmak olurdu. Bunun yerine istisna **ADIYLA ve GEREKÇESİYLE**
 * beyan ediliyor — `yetki-bekci.ts`teki kısıtlı rol beyanının aynısı.
 *
 * ⛔ LİSTEYE GİRMEK BİR MUAFİYET DEĞİL, BİR TAAHHÜTTÜR: beyan edilen betik
 * kendi bekçisini taşımak zorunda (burada `ice-aktarma:dogrula`, 33
 * kontrol + 13 mutasyon). Beyan, denetimsizlik demek değildir.
 *
 * ⚠ VE LİSTE BOŞ DEĞİLSE EKRANDA YAZAR: sessiz bir muafiyet listesi,
 * zamanla kimsenin bakmadığı bir kapı olur.
 */
export const YAZMASI_BEYANLI: { dosya: string; gerekce: string; bekcisi: string }[] = [
  {
    dosya: "canli-hb-hesap-bagla.ts",
    gerekce:
      "K184 — TEK SEFERLİK BAĞ: `ChannelAccount.apiHesapKimligi` alanını doldurur. " +
      "HB canlı API'si `externalId`dekinden BAŞKA cins bir kimlik (Mağaza ID) " +
      "istiyor ve `externalId` EZİLEMEZ (dört içe aktarma onu okuyor). " +
      "⛔ Kapsam bir alan, bir hesap: hedef ADLA değil ÖLÇÜMLE seçiliyor " +
      "(kanal SKU kaydı olan tek hesap) ve aday sayısı 1 değilse DURUYOR; " +
      "dolu bir alanı sessizce ezmiyor; `--uygula` kilidi ve AuditLog izi var. " +
      "⚠ Kimliğin KENDİSİ ize yazılmaz, yalnız uzunluğu — kimlik bir sırdır. " +
      "⚠ Yazım gövdesi `src/lib`e taşınmadı: tek seferlik bir bağ için " +
      "kalıcı bir yazıcı gövdesi açmak, o gövdeyi yarın genel araç yapardı.",
    bekcisi: "hb-listeleme:dogrula",
  },
  {
    dosya: "canli-ty-ice-aktar.ts",
    gerekce:
      "A3-③ onaylı içe aktarma — Sale/SaleItem yazar. Yazım `--yaz` bayrağına kilitli, " +
      "her kayıt importBatch+importKaynak taşır, AuditLog bırakır.",
    bekcisi: "ice-aktarma:dogrula",
  },
  {
    dosya: "canli-hb-ice-aktar.ts",
    gerekce:
      "K165 HB içe aktarma — Sale/SaleItem yazar (TY disiplininin kopyası): " +
      "--yaz kilidi, importBatch+importKaynak, AuditLog, çakışmada atla; " +
      "StockMovement ÜRETMEZ (K164 onay kuyruğu düşürür).",
    bekcisi: "ice-aktarma:dogrula",
  },
  {
    dosya: "canli-n11-ice-aktar.ts",
    gerekce:
      "K167-② N11 içe aktarma — Sale/SaleItem yazar (TY/HB disiplininin kopyası): " +
      "--yaz kilidi, importBatch+importKaynak, AuditLog, çakışmada atla; " +
      "StockMovement ÜRETMEZ (K164 onay kuyruğu düşürür); adet>1 satır " +
      "birim/toplam kanıtı gelene dek YAZILMAZ.",
    bekcisi: "ice-aktarma:dogrula",
  },
  {
    dosya: "canli-ty-hakedis-cekim.ts",
    gerekce:
      "K220 — TY hakediş API çekimi: Settlement/SettlementItem yazar. " +
      "`--yaz` bayrağına kilitli (varsayılan kuru koşum); rowKey dedup " +
      "Excel'le AYNI (id alanı Excel'in Kayıt No'suyla birebir), yeni satır " +
      "ekler ya da yalnız boş `paidAt`ı tazeler — mevcut tutara dokunmaz.",
    bekcisi: "hakedis-yazici:dogrula",
  },
  {
    dosya: "canli-ty-kargo-gercek-olcum.ts",
    gerekce:
      "K220-② — TY gerçek kargo maliyeti: `Sale.cargoAmount` yazar. `--yaz` " +
      "bayrağına kilitli; yalnız `cargoAmount === null` olan satışlara yazar " +
      "(\"gerçekleşen değerin üzerine asla yazılmaz\" kuralı hiç ihlal edilmez), " +
      "yazımdan sonra `satisKarTazele` ile kârı tazeler.",
    bekcisi: "hakedis-yazici:dogrula",
  },
  {
    dosya: "canli-ty-odeme-gunu-onar.ts",
    gerekce:
      "K223-② — GEÇMİŞ ONARIMI: `SettlementItem.paidAt` yazar. `paidAt` " +
      "kalemin KENDİ VADESİNDEN yazılıyordu, ödeme emrinin gününden değil; " +
      "bir ödeme emri BİR gündür ve 91 emrin 91'i de yanlıştı (4486 kalem). " +
      "⛔ METADATA düzeltmesi — dar istisna: değişen alan para/miktar DEĞİL, " +
      "ters kayıt tarih düzeltmez, silme FIFO bağı yüzünden imkânsız. " +
      "`--yaz` bayrağına kilitli; yazımdan ÖNCE yerel anlık görüntü alınır ve " +
      "GERİ OKUNUR, sonra bit-bit doğrulanır; emir emir yazar (tekrar " +
      "koşulabilir), işlem tavanı 120 sn AÇIKÇA ayarlı; her emir için eski " +
      "değerle birlikte `izYaz` bırakır. Geri alma `--geri` ile yerel " +
      "görüntüden — LİSTEYE değil yeniden okunabilir bir kaynağa bağlı.",
    bekcisi: "hakedis-yazici:dogrula",
  },
  {
    dosya: "canli-hb-hakedis-cekim.ts",
    gerekce:
      "K221 — HB hakediş API çekimi: Settlement/SettlementItem yazar. " +
      "`--yaz` bayrağına kilitli; rowKey dedup Excel'le AYNI (externalId = " +
      "isInvoice ? invoiceNumber : packageNumber, çapraz ölçüldü) — çok " +
      "kalemli sipariş çakışmaları TOPLANARAK yazılır, mevcut tutara " +
      "dokunulmaz, tutarsızlık raporlanır.",
    bekcisi: "hakedis-yazici:dogrula",
  },
];
