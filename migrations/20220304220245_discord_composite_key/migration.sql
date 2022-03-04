/*
  Warnings:

  - The primary key for the `DiscordUser` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `DiscordUser` DROP PRIMARY KEY,
    MODIFY `uid` CHAR(18) NULL,
    ADD PRIMARY KEY (`username`, `discriminator`);
