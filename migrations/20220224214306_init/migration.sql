-- CreateTable
CREATE TABLE `DiscordUser` (
    `uid` CHAR(18) NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `discriminator` INTEGER NOT NULL,
    `email` VARCHAR(64) NOT NULL,

    UNIQUE INDEX `DiscordUser_email_key`(`email`),
    PRIMARY KEY (`uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participant` (
    `email` VARCHAR(64) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `role` ENUM('Hacker', 'Organizer', 'Judge', 'Mentor', 'Workshop', 'Panelist', 'Volunteer', 'Sponsor') NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DiscordUser` ADD CONSTRAINT `DiscordUser_email_fkey` FOREIGN KEY (`email`) REFERENCES `Participant`(`email`) ON DELETE RESTRICT ON UPDATE CASCADE;
