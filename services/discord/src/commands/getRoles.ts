import {Role, getConclusionMessage, getNewRoles} from "../roles"
import Case from "case"
import {type DiscordExpressHandler} from "discord-express"
import db from "../db"
import {getGuild} from "../"

export const getRoles: DiscordExpressHandler = async ({user}, response) => {
    const userInfo = await db.participant.findFirst({
        where: {
            discord: {
                uid: user.id,
            },
        },
        include: {
            discord: true,
        },
    })

    if (userInfo) {
        const _guild = await getGuild()
        const userRole = userInfo.role ?? Role.Hacker

        const member =
            _guild.members.cache.find((_member) => _member.user.id === user.id) ??
            (await _guild.members.fetch(user.id))

        await member.setNickname(userInfo.name)
        await member.roles.add(getNewRoles(userRole, userInfo.isInPerson))

        await response.replyEphemeral(
            `Sorry about that, I must've forgotten to give you the roles after you verified! I've given you the ${Case.sentence(
                userRole ?? "unknown role",
            ).toLowerCase()} role (hopefully for real this time)! ${getConclusionMessage(
                userRole,
            )}`,
        )

        return
    }

    await response.replyEphemeral(
        "Looks like you aren't verified. Please contact an organizer for help!",
    )
}
