/**
 * ============================================================================
 *  EL KİTABI — GÖRÜNÜM
 * ----------------------------------------------------------------------------
 *  Tek yerde duruyor çünkü iki çıktı bunu paylaşıyor: uygulamanın içindeki
 *  /el-kitabi sayfası ve indirilebilir tek dosyalık HTML. İki ayrı biçem
 *  olsaydı biri güncellenir öteki unutulurdu.
 *
 *  Renkler konunun kendi dünyasından: sistemin çekirdeği STOK DEFTERİ, o
 *  yüzden muhasebe defteri kâğıdı (soluk yeşil zemin, ince yatay çizgiler).
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
  background:repeating-linear-gradient(to bottom,transparent 0 27px,
    color-mix(in srgb,var(--vurgu) 5%,transparent) 27px 54px),var(--yuzey);
  padding:44px 24px 36px;
}
.ek-kapak-ic{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
.ek-rozet{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--vurgu);display:flex;gap:10px;flex-wrap:wrap}
.ek-rozet span::after{content:"·";margin-left:10px;color:var(--murekkep-3)}
.ek-rozet span:last-child::after{content:""}
.ek h1{font-family:var(--serif);font-size:clamp(2rem,5vw,3.2rem);line-height:1.06;
  font-weight:600;letter-spacing:-.015em;margin:0;text-wrap:balance}
.ek-kapak p{margin:0;max-width:62ch;font-size:1.05rem;color:var(--murekkep-2)}
.ek-duzen{max-width:1180px;margin:0 auto;padding:0 24px 80px;display:grid;
  grid-template-columns:1fr;gap:40px}
@media (min-width:1000px){.ek-duzen{grid-template-columns:232px minmax(0,1fr);gap:56px;align-items:start}}
.ek-toc{position:sticky;top:20px;padding-top:36px;display:none}
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
.ek a{color:var(--vurgu);text-underline-offset:3px}
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
@media print{
  .ek-toc{display:none}
  .ek-duzen{grid-template-columns:1fr}
  .ek-kart,.ek-tablo{box-shadow:none}
  .ek-icerik section{break-inside:avoid-page}
}
`;
