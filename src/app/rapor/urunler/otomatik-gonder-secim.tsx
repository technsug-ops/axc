"use client";

/**
 * ============================================================================
 *  DEĞİŞİNCE ANINDA UYGULA — SIRALA/YÖN/SATIR İÇİN (11.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"filtrelerin frontend'i daha efektif olabilir"_ — ölçüt
 *  netleşince (AskUserQuestion): kompakt + az tıkla + net gruplama.
 *
 *  ⛔ NİYE AYRI BİR "USE CLIENT" GÖVDESİ: `AnalizSuzgeci` sunucu bileşeni,
 *  `onChange` sunucu tarafında ÇALIŞAMAZ. Dönem/Kanal/Para/Etiket çipleri
 *  zaten tek tıkla uyguluyordu (`<Link>`); Sırala/Yön/Satır ise `<select>`
 *  olduğu için `<Link>`e çevrilemez (değer sayısı kadar bağlantı gerekirdi)
 *  — doğru araç `<select>` + değişince FORMU GÖNDER'dir.
 *
 *  ⚠ MİN ADET / MİN CİRO'YA UYGULANMADI — BİLEREK: onlar SERBEST METİN,
 *  her tuşta göndermek her hane için bir sayfa geçişi demektir. "Uygula"
 *  düğmesi bu iki alan için hâlâ geçerli; select'ler İÇİN gereksizleşti.
 * ============================================================================
 */
export function OtomatikGonderSecim({
  id,
  name,
  defaultValue,
  className,
  children,
}: {
  id: string;
  name: string;
  defaultValue: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className={className}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
