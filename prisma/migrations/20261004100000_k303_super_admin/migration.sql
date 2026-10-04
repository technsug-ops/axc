-- K303 Aşama 4c-2 (04.10.2026) — Selliora süper admin işareti.
-- Yalnız DENEME kurulumunda koşar. Var olan bütün kullanıcılar false başlar;
-- hiçbir satırın değeri değişmez, yalnız yeni sütun eklenir.
ALTER TABLE `User` ADD COLUMN `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false;
