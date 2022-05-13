import Case from "case"
import Prisma from "@prisma/client"

// eslint-disable-next-line @typescript-eslint/naming-convention
export const {Role} = Prisma
export type Role = Prisma.Role

export enum DiscordRoles {
    Organizer = "948348689783595018",
    Verified = "948354806722986014",
    Judge = "948378061794074685",
    Hacker = "948378309031514112",
    Volunteer = "948379112890826753",
    Mentor = "948379221896601662",
    WorkshopRunner = "948379262967246849",
    Panelist = "948379332924018719",
    Sponsor = "948379341010636810",
    Online = "974476332165656616",
    InPerson = "974476272040308836",
}

export const getDiscordRoleFromDbRole = (role?: Role | null): DiscordRoles | undefined => {
    if (role === undefined || role === null || role === Role.Organizer) {
        return undefined
    }

    return DiscordRoles[role]
}

export const getNewRoles = (role?: Role | null, isInPerson?: boolean): DiscordRoles[] => {
    const newRoles = [DiscordRoles.Verified]

    if (isInPerson !== undefined) {
        newRoles.push(isInPerson ? DiscordRoles.InPerson : DiscordRoles.Online)
    }

    const newRole = getDiscordRoleFromDbRole(role)

    if (newRole) {
        newRoles.push(newRole)
    }

    return newRoles
}

export const getConclusionMessage = (role: Role | null): string => {
    switch (role) {
        case null:
        case undefined:
        case Role.Organizer:
            return ""
        case Role.Hacker:
            return "Happy hacking!"
        case Role.Judge:
            return "Thank you for judging!"
        case Role.WorkshopRunner:
            return "Thank you for taking your time to run a workshop!"
        case Role.Panelist:
            return "Thank you for being a panelist!"
        default:
            return `Thank you for ${Case.sentence(role).toLowerCase()}ing!`
    }
}
