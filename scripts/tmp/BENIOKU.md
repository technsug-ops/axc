# `scripts/tmp/` — GEÇİCİ ÖLÇÜM BETİKLERİ

**Buraya yazılan hiçbir dosya commit'e giremez.** `.gitignore` bu klasörün
içindekilerin tamamını yok sayar; tek istisna bu dosyadır (klasör depoda
görünsün diye).

## Niye var — mekanizma, alışkanlık değil

24.08.2026'da bir ölçüm betiği (`gecici-p.ts`) commit'e sızdı. Sebebi
dikkatsizlik değil, **sıralamaydı**: silme komutu yazma komutuyla aynı
zincirde koşunca silme, dosya doğmadan çalıştı ve dosya ortada kaldı.

Aynı gün ders yazıldı: _"bir dahaki sefere silmeyi unutmam"_ bir çözüm
değil, bir **niyettir**. Niyet unutulur; `.gitignore` unutmaz.

## Kullanım

Tek seferlik ölçüm/teşhis betikleri buraya yazılır:

```
scripts/tmp/olcum-hakedis.ts
npx tsx scripts/tmp/olcum-hakedis.ts
```

Silmek **gerekmez** — sızamaz. Silmek isterseniz zararsız.

## Buraya YAZILMAYACAK olanlar

- **Bekçiler** (`*:dogrula`) — onlar kalıcıdır, `scripts/` altına yazılır
  ve `package.json`a girer; bekçi turunun onları görmesi gerekir.
- **Canlı bakım araçları** (`canli:*`) — tekrar koşulacakları için kalıcıdır.
- **Ölçüm ÇIKTILARI** — onlar `raporlar/` altına gider (o da yok sayılır).

Ölçüt tek soru: **bu betik ikinci kez koşulacak mı?** Cevap "hayır" ise
buraya; "evet" ise `scripts/` altına ve adıyla.
