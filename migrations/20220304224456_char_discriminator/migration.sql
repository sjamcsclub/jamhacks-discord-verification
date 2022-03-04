/*
  Warnings:

  - The primary key for the `DiscordUser` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `DiscordUser` DROP PRIMARY KEY,
    MODIFY `discriminator` CHAR(4) NOT NULL,
    ADD PRIMARY KEY (`username`, `discriminator`);
