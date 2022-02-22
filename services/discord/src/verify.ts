import * as yup from "yup"
import {type DiscordExpressHandler} from "discord-express"
import {SendEmailCommand} from "@aws-sdk/client-ses"
import {checkEmail} from "./utils/checkEmail"
import {encodeAndSign} from "@luke-zhang-04/utils/node/crypto"
import {fileURLToPath} from "url"
import fs from "fs"
import juice from "juice"
import mustache from "mustache"
import path from "path"
import {pick} from "@luke-zhang-04/utils"
import {ses} from "./aws"

const dirname = path.dirname(fileURLToPath(import.meta.url))

const messageCommandBodySchema = yup.object({
    _: yup.array(yup.string()).required().min(1, "provide an email address"),
})

const slashCommandBodySchema = yup.object({
    email: yup.string().email().required(),
})

const sentEmails: {[uid: string]: Set<string>} = {}

const template = fs.readFileSync(`${dirname}/../templates/verificationEmail.mustache`, "utf8")

export const verify: DiscordExpressHandler = async (request, response) => {
    const {email} = request.isMessageRequest
        ? {email: (await messageCommandBodySchema.validate(request.body))._.join(" ")}
        : await slashCommandBodySchema.validate(request.body)

    if (sentEmails[request.user.id]?.has(email)) {
        return await response.reply("We've already sent an email to this account")
    }

    const error = await checkEmail(email)

    if (error !== undefined) {
        return await response.reply(error)
    }

    ;(sentEmails[request.user.id] ??= new Set()).add(email)

    const urlData = {
        discord: {
            ...pick(request.user, "username", "discriminator"),
            userId: request.user.id,
            avatarURL: request.user.avatarURL({size: 128, format: "png"}),
        },
        email,
        iss: Date.now(),
    }

    const renderedEmail = juice(
        mustache.render(template, {
            name: "YOUR MOM",
            ...pick(request.user, "username", "discriminator"),
            avatarURL: request.user.avatarURL({size: 128, format: "png"}),
            url: `https://verify.jamhacks.ca/verify/${await encodeAndSign(
                JSON.stringify(urlData),
                "sha384",
                process.env.HASH_TOKEN,
                "base64url",
            )}`,
        }),
        {},
    )

    await ses.send(
        new SendEmailCommand({
            Destination: {
                ToAddresses: [email],
            },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: renderedEmail,
                    },
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: "Verify your Discord account for Jamhacks 6",
                },
            },
            Source: "luke@jamhacks.ca",
        }),
    )

    return await response.reply(`Sent an email to ${email}`)
}
