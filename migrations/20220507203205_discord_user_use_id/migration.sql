/*
  Warnings:

  - The primary key for the `DiscordUser` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `uid` on table `DiscordUser` required. This step will fail if there are existing NULL values in that column.

*/

DELETE FROM `DiscordUser` WHERE `uid` IS NULL;

-- AlterTable
ALTER TABLE `DiscordUser` DROP PRIMARY KEY,
    MODIFY `uid` CHAR(18) NOT NULL,
    MODIFY `username` VARCHAR(64) NULL,
    MODIFY `discriminator` VARCHAR(64) NULL,
    ADD PRIMARY KEY (`uid`);
