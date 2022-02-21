import * as yup from "yup"
import {type DiscordExpressHandler} from "discord-express"
import {checkEmail} from "./utils/checkEmail"

const messageCommandBodySchema = yup.object({
    _: yup.array(yup.string()).required(),
})

const slashCommandBodySchema = yup.object({
    email: yup.string().email().required(),
})

export const verify: DiscordExpressHandler = async (request, response) => {
    const {email} = request.isMessageRequest
        ? {email: (await messageCommandBodySchema.validate(request.body))._.join(" ")}
        : await slashCommandBodySchema.validate(request.body)

    const error = await checkEmail(email)

    if (error !== undefined) {
        return await response.reply(error)
    }

    return await response.reply(`Sent an email to ${email}! (not really)`)
}
