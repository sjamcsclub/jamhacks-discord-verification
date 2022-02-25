/*
  Warnings:

  - The values [Workshop] on the enum `Participant_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Participant` MODIFY `role` ENUM('Hacker', 'Organizer', 'Judge', 'Mentor', 'WorkshopRunner', 'Panelist', 'Volunteer', 'Sponsor') NULL;
