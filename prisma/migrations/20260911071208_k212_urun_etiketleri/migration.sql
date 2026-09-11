-- AlterTable
ALTER TABLE `Product` ADD COLUMN `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `needsReview` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `season` ENUM('YAZ', 'KIS') NULL;

-- CreateIndex
CREATE INDEX `Product_isFavorite_idx` ON `Product`(`isFavorite`);

-- CreateIndex
CREATE INDEX `Product_needsReview_idx` ON `Product`(`needsReview`);
