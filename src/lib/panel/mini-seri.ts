/**
 * KPI KUTUSUNUN MİNİ ÇUBUKLARI — Algoritmo referansı (kullanıcı kararı
 * 07.10.2026; `docs/algoritmo-analizi.md` §4.2: «sağ altta 5–6 dikey çubuk»).
 *
 * Dönemin kendi serisi (gün/hafta/ay kovaları) ardışık gruplara bölünüp
 * toplanır: çubuk, kutudaki rakamın DÖNEM İÇİNDE nasıl biriktiğini gösterir.
 * ⚠ Ayrı bir sorgu YOK — panelin zaten çizdiği seriden türetilir; çubuk ile
 * grafik aynı sayıdan beslendiği için ayrışamaz.
 * ⚠ Seri kovadan kısaysa bölünmez, olduğu gibi döner (uydurma kova yok).
 */
export function miniKovalar(degerler: readonly number[], kovaSayisi = 6): number[] {
  if (kovaSayisi < 1) return [];
  if (degerler.length <= kovaSayisi) return [...degerler];
  const sonuc: number[] = [];
  for (let k = 0; k < kovaSayisi; k++) {
    const bas = Math.floor((k * degerler.length) / kovaSayisi);
    const son = Math.floor(((k + 1) * degerler.length) / kovaSayisi);
    let toplam = 0;
    for (let i = bas; i < son; i++) toplam += degerler[i]!;
    sonuc.push(toplam);
  }
  return sonuc;
}
