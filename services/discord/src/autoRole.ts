import {Collection, GuildMember, Invite} from "discord.js"
import {DiscordRoles, type Role, getConclusionMessage} from "./roles"
import Case from "case"
import linkRoles from "./autorole-mapping.json" assert {type: "json"}
import {pick} from "@luke-zhang-04/utils"

let inviteCache: Pick<Invite, "code" | "uses">[] = []

export const setInviteCache = (invites: Collection<string, Invite>): void => {
    inviteCache = Array.from(invites).map(([, invite]) => pick(invite, "code", "uses"))
}

export const autoRoles = async (member: GuildMember): Promise<boolean> => {
    if (member.guild.invites.cache.size === 0) {
        await member.guild.invites.fetch({cache: true})
    }

    const invites = await member.guild.invites.fetch({cache: true})

    const usedInvite = inviteCache.find(
        (cachedInvite) => (invites.get(cachedInvite.code)?.uses ?? 0) > (cachedInvite.uses ?? 0),
    )

    setInviteCache(member.guild.invites.cache)

    if (usedInvite) {
        const [, newRoleCode, newRoleName] =
            linkRoles.find(([link]) => link === usedInvite.code) ?? []

        if (newRoleCode && newRoleName) {
            await member.roles.add([newRoleCode, DiscordRoles.Verified])
            try {
                await member.send(
                    `Hello ${
                        member.user.username
                    }, and welcome to JAMHacks! I've given you the role for ${Case.sentence(
                        newRoleName,
                    ).toLowerCase()}s, and if you need other roles, just ask an organizer! ${getConclusionMessage(
                        newRoleName as Role,
                    )}`,
                )
            } catch (err) {
                console.error(err)
            }

            return true
        }
    }

    return false
}
