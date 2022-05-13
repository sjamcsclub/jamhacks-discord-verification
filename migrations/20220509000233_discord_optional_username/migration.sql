/*
  Warnings:

  - Made the column `username` on table `DiscordUser` required. This step will fail if there are existing NULL values in that column.
  - Made the column `discriminator` on table `DiscordUser` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `DiscordUser` MODIFY `username` VARCHAR(64) NOT NULL,
    MODIFY `discriminator` CHAR(4) NOT NULL;
