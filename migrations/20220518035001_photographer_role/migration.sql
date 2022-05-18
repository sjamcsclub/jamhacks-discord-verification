-- AlterTable
ALTER TABLE `Participant` MODIFY `role` ENUM('Hacker', 'Organizer', 'Judge', 'Mentor', 'WorkshopRunner', 'Panelist', 'Volunteer', 'Sponsor', 'Photographer') NULL;
