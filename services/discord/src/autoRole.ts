import {Collection, GuildMember, Invite} from "discord.js"
import {DiscordRoles} from "./roles"
import linkRoles from "./autorole-mapping.json"
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
        const newRole = linkRoles.find(([link]) => link === usedInvite.code)?.[1]

        if (newRole) {
            member.roles.add(newRole, DiscordRoles.Verified)

            return true
        }
    }

    return false
}
