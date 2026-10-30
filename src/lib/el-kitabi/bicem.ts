/**
 * ============================================================================
 *  EL KİTABI — GÖRÜNÜM
 * ----------------------------------------------------------------------------
 *  Tek yerde duruyor çünkü iki çıktı bunu paylaşıyor: uygulamanın içindeki
 *  /el-kitabi sayfası ve indirilebilir tek dosyalık HTML. İki ayrı biçem
 *  olsaydı biri güncellenir öteki unutulurdu.
 *
 *  Renkler konunun kendi dünyasından: sistemin çekirdeği STOK DEFTERİ, o
 *  yüzden muhasebe defteri tonları (soluk yeşil zemin). Kapaktaki şeritli
 *  «defter çizgisi» 21.10.2026'da kaldırıldı: ekranda hata gibi duruyordu
 *  (kullanıcı: «saçma bir tasarım»); kapak artık kısa, düz bir başlık bandı.
 *  Uyarı ve tehlike tonları uygulamanın kendi uyarı renkleriyle aynı aileden.
 * ============================================================================
 */
export const EL_KITABI_BICEMI = `
:root{
  --zemin:#EEF2EE; --yuzey:#FFFFFF; --yuzey-2:#F6F9F6;
  --murekkep:#14201C; --murekkep-2:#47564F; --murekkep-3:#6E7D75;
  --cizgi:#D3DDD5; --cizgi-2:#E3EAE4;
  --vurgu:#0F5C4A; --vurgu-yumusak:#DCEBE4;
  --uyari:#8A5A00; --uyari-zemin:#FBF0D9;
  --tehlike:#8A2A22; --tehlike-zemin:#FAE7E4; --iyi:#1B6B4A;
  --golge:0 1px 2px rgba(20,32,28,.06),0 8px 24px -12px rgba(20,32,28,.18);
  --serif:ui-serif,Georgia,"Iowan Old Style","Times New Roman",serif;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  --mono:ui-monospace,"Cascadia Mono","SF Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --zemin:#101613; --yuzey:#161E1A; --yuzey-2:#1B2420;
    --murekkep:#E2EAE5; --murekkep-2:#A9B8B0; --murekkep-3:#7E8E86;
    --cizgi:#2A3630; --cizgi-2:#222D28;
    --vurgu:#59BE9B; --vurgu-yumusak:#1A2E27;
    --uyari:#E0AE5A; --uyari-zemin:#2C2415;
    --tehlike:#E48F84; --tehlike-zemin:#2E1B18; --iyi:#5CBE92;
    --golge:0 1px 2px rgba(0,0,0,.4),0 8px 24px -12px rgba(0,0,0,.6);
  }
}
:root[data-theme="dark"]{
  --zemin:#101613; --yuzey:#161E1A; --yuzey-2:#1B2420;
  --murekkep:#E2EAE5; --murekkep-2:#A9B8B0; --murekkep-3:#7E8E86;
  --cizgi:#2A3630; --cizgi-2:#222D28;
  --vurgu:#59BE9B; --vurgu-yumusak:#1A2E27;
  --uyari:#E0AE5A; --uyari-zemin:#2C2415;
  --tehlike:#E48F84; --tehlike-zemin:#2E1B18; --iyi:#5CBE92;
  --golge:0 1px 2px rgba(0,0,0,.4),0 8px 24px -12px rgba(0,0,0,.6);
}
.ek *{box-sizing:border-box}
.ek{
  background:var(--zemin); color:var(--murekkep);
  font-family:var(--sans); font-size:16px; line-height:1.65;
  -webkit-font-smoothing:antialiased;
}
.ek-kapak{
  border-bottom:1px solid var(--cizgi);
  background:var(--yuzey);
  padding:24px 24px 22px;
}
.ek-kapak-ic{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:8px}
.ek-rozet{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--vurgu);display:flex;gap:10px;flex-wrap:wrap}
.ek-rozet span::after{content:"·";margin-left:10px;color:var(--murekkep-3)}
.ek-rozet span:last-child::after{content:""}
.ek h1{font-family:var(--serif);font-size:clamp(1.7rem,4vw,2.3rem);line-height:1.1;
  font-weight:600;letter-spacing:-.015em;margin:0;text-wrap:balance}
.ek-kapak p{margin:0;max-width:62ch;font-size:1.05rem;color:var(--murekkep-2)}
.ek-duzen{max-width:1180px;margin:0 auto;padding:0 24px 80px;display:grid;
  grid-template-columns:1fr;gap:40px}
@media (min-width:1000px){.ek-duzen{grid-template-columns:232px minmax(0,1fr);gap:56px;align-items:start}}
.ek-toc{position:sticky;top:20px;padding-top:36px;display:none;max-height:calc(100vh - 20px);overflow-y:auto;padding-bottom:24px}
@media (min-width:1000px){.ek-toc{display:block}}
.ek-toc h2{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--murekkep-3);margin:0 0 12px;font-weight:600}
.ek-toc ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.ek-toc a{display:grid;grid-template-columns:22px 1fr;gap:6px;padding:5px 8px 5px 0;
  color:var(--murekkep-2);text-decoration:none;font-size:13.5px;border-radius:5px;line-height:1.35}
.ek-toc a b{font-family:var(--mono);font-size:11px;color:var(--murekkep-3);font-weight:500;padding-top:2px}
.ek-toc a:hover{color:var(--vurgu);background:var(--vurgu-yumusak)}
.ek-toc a:hover b{color:var(--vurgu)}
.ek-toc a:focus-visible{outline:2px solid var(--vurgu);outline-offset:2px}
.ek-toc h2 a{color:inherit;text-decoration:none;display:inline;padding:0}
.ek-toc details{border-top:1px solid var(--cizgi)}
.ek-toc summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;
  gap:8px;padding:9px 6px 9px 0;font-size:13.5px;font-weight:650;color:var(--murekkep);min-height:36px}
.ek-toc summary::-webkit-details-marker{display:none}
.ek-toc summary::before{content:"▸";color:var(--murekkep-3);font-size:11px;width:12px}
.ek-toc details[open] summary::before{content:"▾"}
.ek-toc summary i{font-style:normal;font-family:var(--mono);font-size:11px;color:var(--murekkep-3);margin-left:auto}
.ek-toc summary:hover{color:var(--vurgu)}
.ek-toc details ol{padding:0 0 8px 12px}
.ek-harita{display:flex;flex-direction:column;gap:15px;scroll-margin-top:20px}
.ek-harita-izgara{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.ek-grup{background:var(--yuzey);border:1px solid var(--cizgi);border-radius:10px;padding:14px 16px;box-shadow:var(--golge)}
.ek .ek-grup h3{margin:0 0 8px;font-size:.95rem}
.ek-grup ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
.ek-grup a{display:grid;grid-template-columns:24px 1fr;gap:6px;padding:7px 4px;min-height:44px;align-items:center;
  color:var(--murekkep-2);text-decoration:none;font-size:14px;border-radius:5px;line-height:1.3}
.ek-grup a b{font-family:var(--mono);font-size:11px;color:var(--murekkep-3);font-weight:500}
.ek-grup a:hover{color:var(--vurgu);background:var(--vurgu-yumusak)}
.ek-grup-basi{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--murekkep-3);font-weight:700;padding-top:12px}
.ek-ekran{margin:4px 0 6px;display:flex;flex-direction:column;gap:6px;max-width:100%}
.ek-ekran img{display:block;width:100%;height:auto;border:1px solid var(--cizgi);border-radius:10px;box-shadow:var(--golge);background:var(--yuzey)}
.ek-ekran.telefon{max-width:300px}
.ek-ekran figcaption{font-size:.84rem;color:var(--murekkep-2);max-width:68ch}
.ek-ekran figcaption span{color:var(--murekkep-3)}
.ek h2.bolum .ek-yukari{margin-left:auto;font-family:var(--sans);font-size:12.5px;font-weight:500;
  letter-spacing:0;white-space:nowrap;text-decoration:none;align-self:center;padding:10px 0 10px 8px}
.ek-icerik{padding-top:36px;min-width:0;display:flex;flex-direction:column;gap:48px}
.ek-icerik section{scroll-margin-top:20px;display:flex;flex-direction:column;gap:15px}
.ek h2.bolum{font-family:var(--serif);font-size:clamp(1.45rem,3vw,1.9rem);line-height:1.15;
  font-weight:600;letter-spacing:-.01em;margin:0;padding-bottom:11px;
  border-bottom:2px solid var(--vurgu);display:flex;align-items:baseline;gap:14px;text-wrap:balance}
.ek h2.bolum b{font-family:var(--mono);font-size:.74rem;color:var(--vurgu);font-weight:600;
  letter-spacing:.1em;flex-shrink:0}
.ek h3{font-family:var(--sans);font-size:1.05rem;font-weight:650;margin:10px 0 0;
  letter-spacing:-.005em;text-wrap:balance}
.ek p{margin:0;max-width:68ch}
.ek-icerik ul{margin:0;padding-left:1.15rem;max-width:68ch;display:flex;flex-direction:column;gap:7px}
.ek li::marker{color:var(--murekkep-3)}
.ek strong{font-weight:650}
.ek em{font-style:normal;background:var(--vurgu-yumusak);padding:0 .25em;border-radius:3px}
.ek code{font-family:var(--mono);font-size:.855em;background:var(--yuzey-2);
  border:1px solid var(--cizgi-2);padding:.08em .38em;border-radius:4px;white-space:nowrap}
.ek a{color:var(--vurgu);text-decoration:none}
.ek-kart{background:var(--yuzey);border:1px solid var(--cizgi);border-radius:10px;
  padding:20px 22px;display:flex;flex-direction:column;gap:11px;box-shadow:var(--golge)}
.ek-not{border-left:3px solid var(--murekkep-3);background:var(--yuzey-2);padding:14px 18px;
  border-radius:0 8px 8px 0;display:flex;flex-direction:column;gap:6px;max-width:70ch}
.ek-not .etiket{font-family:var(--mono);font-size:10.5px;letter-spacing:.13em;
  text-transform:uppercase;color:var(--murekkep-3);font-weight:600}
.ek-not p{font-size:.94rem;color:var(--murekkep-2)}
.ek-not.dikkat{border-left-color:var(--uyari);background:var(--uyari-zemin)}
.ek-not.dikkat .etiket{color:var(--uyari)}
.ek-not.dikkat p{color:var(--murekkep)}
.ek-not.kritik{border-left-color:var(--tehlike);background:var(--tehlike-zemin)}
.ek-not.kritik .etiket{color:var(--tehlike)}
.ek-not.kritik p{color:var(--murekkep)}
.ek-not.canli{border-left-color:var(--vurgu);background:var(--vurgu-yumusak)}
.ek-not.canli .etiket{color:var(--vurgu)}
.ek-not.canli p{color:var(--murekkep)}
.ek-tablo{overflow-x:auto;border:1px solid var(--cizgi);border-radius:10px;background:var(--yuzey)}
.ek table{border-collapse:collapse;width:100%;font-size:.92rem}
.ek th,.ek td{text-align:left;padding:10px 15px;border-bottom:1px solid var(--cizgi-2);vertical-align:top}
.ek thead th{background:var(--yuzey-2);font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--murekkep-3);font-weight:600;white-space:nowrap}
.ek tbody tr:last-child td{border-bottom:none}
.ek td.sayi{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.ek td.kod{font-family:var(--mono);font-size:.86rem;white-space:nowrap}
.ek ol.adimlar{counter-reset:adim;list-style:none;padding-left:0;margin:0;
  display:flex;flex-direction:column;gap:14px;max-width:68ch}
.ek ol.adimlar>li{counter-increment:adim;display:grid;grid-template-columns:26px minmax(0,1fr);
  gap:14px;align-items:start}
.ek ol.adimlar>li::before{content:counter(adim);font-family:var(--mono);font-size:11px;
  font-weight:600;color:var(--vurgu);background:var(--vurgu-yumusak);border-radius:50%;
  width:26px;height:26px;display:grid;place-items:center;margin-top:1px}
.ek .formul{font-family:var(--mono);font-size:.87rem;line-height:1.9;background:var(--yuzey-2);
  border:1px solid var(--cizgi-2);border-radius:8px;padding:16px 18px;overflow-x:auto;
  white-space:pre;color:var(--murekkep)}
.ek .formul b{color:var(--vurgu);font-weight:600}
.ek .izgara{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:14px}
.ek .izgara .ek-kart{gap:5px}
.ek .ust{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--murekkep-3);font-weight:600}
.ek .buyuk{font-family:var(--serif);font-size:1.2rem;line-height:1.25}
.ek .izgara .ek-kart p{font-size:.9rem;color:var(--murekkep-2)}
.ek .pul{display:inline-block;font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;
  padding:2px 7px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}
.ek .pul.yok{color:var(--murekkep-3)}
.ek-dip{border-top:1px solid var(--cizgi);background:var(--yuzey);padding:26px 24px 36px}
.ek-dip-ic{max-width:1180px;margin:0 auto;color:var(--murekkep-3);font-size:.87rem;
  display:flex;flex-direction:column;gap:5px}

/* ══════════════ EKRAN ŞEMASI — "burası neresi" ══════════════
   ⚠ EKRAN FOTOĞRAFI DEĞİL, ÇİZİM. Projede tarayıcı otomasyonu yok
   (karar 08.08.2026), yani ekran görüntüsü üretilemiyor. Ama asıl
   gerekçe teknik değil: fotoğraf ekran her değiştiğinde BAYATLAR ve
   bayat fotoğraf, kılavuzu yanlış yapar — üstelik sessizce. Çizim
   kodun içinde yaşıyor; bir bölüm taşınırsa şema da düzeltilir.
   Amaç ekranı taklit etmek değil, YERİ tarif etmek. */
.ek .ek-ekran{margin:22px 0;display:flex;flex-direction:column;gap:8px}
.ek .ek-ekran>figcaption{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--murekkep-3);font-weight:600}
.ek .ekran-cerceve{border:1px solid var(--cizgi);border-radius:10px;overflow:hidden;
  background:var(--yuzey);box-shadow:var(--golge)}
.ek .ekran-cubuk{display:flex;align-items:center;gap:7px;padding:7px 12px;
  background:var(--yuzey-2);border-bottom:1px solid var(--cizgi-2);
  font-family:var(--mono);font-size:11.5px;color:var(--murekkep-2)}
.ek .ekran-cubuk::before{content:"";width:9px;height:9px;border-radius:50%;
  background:var(--cizgi);box-shadow:14px 0 0 var(--cizgi),28px 0 0 var(--cizgi);
  margin-right:24px;flex:none}
.ek .ekran-govde{padding:12px;display:grid;gap:9px;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.ek .ekran-blok{border:1px dashed var(--cizgi);border-radius:8px;padding:10px 11px;
  background:var(--yuzey-2);display:flex;flex-direction:column;gap:3px;min-width:0}
.ek .ekran-blok.genis{grid-column:1/-1}
.ek .ekran-blok.vurgulu{border-style:solid;border-color:var(--vurgu);
  background:var(--vurgu-yumusak)}
.ek .ekran-blok h4{margin:0;font-family:var(--sans);font-size:.86rem;font-weight:600;
  color:var(--murekkep);display:flex;align-items:center;gap:7px}
.ek .ekran-blok p{margin:0;font-size:.8rem;line-height:1.5;color:var(--murekkep-2)}
.ek .ekran-no{flex:none;width:19px;height:19px;border-radius:50%;display:grid;
  place-items:center;font-family:var(--mono);font-size:11px;font-weight:600;
  background:var(--vurgu);color:var(--yuzey)}

/* ══════════════ ÜÇLÜ — ne zaman · adım adım · sık hata ══════════════
   Kullanıcı 21.08.2026: _"bir aptalın anlayacağı şekle getir"_.
   Eski kılavuz ÇOĞUNLUKLA "bu ekran nedir" anlatıyordu; ilk kez gören
   birinin sorusu ise "ne zaman buraya gelirim ve ne tıklarım". */
.ek .ek-nezaman{border-left:3px solid var(--vurgu);background:var(--vurgu-yumusak);
  border-radius:0 8px 8px 0;padding:11px 14px;margin:16px 0}
.ek .ek-nezaman .etiket{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--vurgu);font-weight:700;margin-bottom:3px}
.ek .ek-nezaman p{margin:0;color:var(--murekkep)}
.ek .ek-hata{border:1px solid var(--cizgi);border-radius:9px;margin:16px 0;overflow:hidden}
.ek .ek-hata>div:first-child{background:var(--tehlike-zemin);color:var(--tehlike);
  padding:7px 13px;font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;
  text-transform:uppercase;font-weight:700}
.ek .ek-hata dl{margin:0;padding:11px 14px;display:grid;gap:9px}
.ek .ek-hata dt{font-weight:600;font-size:.9rem;color:var(--murekkep)}
.ek .ek-hata dd{margin:2px 0 0;font-size:.88rem;line-height:1.6;color:var(--murekkep-2)}
.ek .ek-hata dd::before{content:"→ ";color:var(--vurgu);font-weight:700}

@media print{
  .ek-toc,.ek-yukari{display:none}
  .ekran-cerceve,.ek-hata{box-shadow:none}
  .ek-duzen{grid-template-columns:1fr}
  .ek-kart,.ek-tablo{box-shadow:none}
  .ek-icerik section{break-inside:avoid-page}
}
`;
