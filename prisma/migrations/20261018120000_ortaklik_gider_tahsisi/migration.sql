-- CreateTable
CREATE TABLE `OrtaklikGiderTahsisi` (
    `id` VARCHAR(191) NOT NULL,
    `expenseId` VARCHAR(191) NOT NULL,
    `projeId` VARCHAR(191) NOT NULL,
    `payYuzdesi` DECIMAL(5, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrtaklikGiderTahsisi_projeId_idx`(`projeId`),
    UNIQUE INDEX `OrtaklikGiderTahsisi_expenseId_projeId_key`(`expenseId`, `projeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrtaklikGiderTahsisi` ADD CONSTRAINT `OrtaklikGiderTahsisi_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtaklikGiderTahsisi` ADD CONSTRAINT `OrtaklikGiderTahsisi_projeId_fkey` FOREIGN KEY (`projeId`) REFERENCES `OrtaklikProjesi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

