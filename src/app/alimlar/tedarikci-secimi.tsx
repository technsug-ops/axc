"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tedarikciKoduOner } from "@/lib/kimlik";

import {
  tedarikciEkle,
  type TedarikciDurumu,
} from "../ayarlar/tedarikciler/actions";

export type TedarikciSecenegi = { id: string; ad: string; kod: string };

/**
 * ============================================================================
 *  ALIM FORMUNDA TEDARİKÇİ SEÇİMİ + AKIŞ İÇİ EKLEME
 * ----------------------------------------------------------------------------
 *  Tedarikçi ZORUNLU oldu, çünkü alım numarası onun kodundan üretiliyor
 *  (ALM-HE-260811-01). Zorunluluk ancak EKLEMEK KOLAYSA meşrudur: yeni bir
 *  tedarikçiyle karşılaşan kullanıcı ayarlara gidip geri dönmek zorunda
 *  kalırsa yarım kalan alım formunu kaybeder.
 *
 *  Bu yüzden ekleme SAYFADAN ÇIKMADAN, küçük bir diyalogda yapılır: ad + kod,
 *  iki alan. Kayıt olunca yeni tedarikçi listeye eklenir ve KENDİLİĞİNDEN
 *  seçilir — kullanıcı kaldığı yerden devam eder.
 * ============================================================================
 */
export function TedarikciSecimi({
  secenekler,
  secili,
  onSecim,
  onYeni,
}: {
  secenekler: TedarikciSecenegi[];
  secili: string;
  onSecim: (id: string) => void;
  /** Diyalogdan yeni kayıt çıkınca listeye eklensin diye. */
  onYeni: (yeni: TedarikciSecenegi) => void;
}) {
  const t = useTranslations("Tedarikci");
  const tAlim = useTranslations("Alim");
  const ortak = useTranslations("Ortak");

  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState("");
  const [kod, setKod] = useState("");

  const [durum, formAction, bekliyor] = useActionState<
    TedarikciDurumu,
    FormData
  >(tedarikciEkle, {});

  // Kayıt başarılıysa: diyaloğu kapat, yeni kaydı seç, alanları temizle.
  // Render sırasında ayarlanıyor; useEffect zincirleme render üretirdi.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.yeniId) {
      onYeni({ id: durum.yeniId, ad, kod: kod.toLocaleUpperCase("tr") });
      onSecim(durum.yeniId);
      setAcik(false);
      setAd("");
      setKod("");
    }
  }

  const oneri = tedarikciKoduOner(ad);

  return (
    <div className="space-y-2">
      <Label htmlFor="alim-tedarikci">{tAlim("tedarikci")} *</Label>
      <div className="flex gap-2">
        <Select value={secili} onValueChange={onSecim}>
          <SelectTrigger id="alim-tedarikci" className="w-full">
            <SelectValue placeholder={tAlim("tedarikciSecin")} />
          </SelectTrigger>
          <SelectContent>
            {secenekler.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.ad} — {s.kod}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={acik} onOpenChange={setAcik}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              title={t("yeniTedarikci")}
              aria-label={t("yeniTedarikci")}
              className="shrink-0"
            >
              <Plus />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("yeniTedarikci")}</DialogTitle>
              <DialogDescription>{tAlim("tedarikciEklemeNotu")}</DialogDescription>
            </DialogHeader>

            {/* Ayrı <form> DEĞİL: alım formunun içindeyiz, iç içe form
                geçersiz HTML olurdu ve dış form da gönderilirdi. Düğme
                doğrudan action'ı çağırır. */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mini-ted-ad">{ortak("ad")} *</Label>
                <Input
                  id="mini-ted-ad"
                  value={ad}
                  onChange={(e) => setAd(e.target.value)}
                  placeholder={t("adIpucu")}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mini-ted-kod">{ortak("kod")} *</Label>
                <div className="flex gap-2">
                  <Input
                    id="mini-ted-kod"
                    value={kod}
                    onChange={(e) => setKod(e.target.value)}
                    placeholder={t("kodIpucu")}
                    autoComplete="off"
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={oneri === null}
                    onClick={() => oneri && setKod(oneri)}
                  >
                    {ortak("oner")}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("kodAciklama")}
                </p>
              </div>

              <HataOzeti hatalar={durum.hatalar} />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAcik(false)}
              >
                {ortak("vazgec")}
              </Button>
              <Button
                type="button"
                disabled={bekliyor}
                onClick={() => {
                  const veri = new FormData();
                  veri.set("name", ad);
                  veri.set("code", kod);
                  veri.set("contact", "");
                  veri.set("note", "");
                  // startTransition ŞART: useActionState'in action'ı geçiş
                  // dışında çağrılırsa React konsola hata basar ve bekleme
                  // durumu ("Ekleniyor...") hiç görünmez.
                  startTransition(() => formAction(veri));
                }}
              >
                {bekliyor ? ortak("ekleniyor") : t("tedarikciEkle")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
