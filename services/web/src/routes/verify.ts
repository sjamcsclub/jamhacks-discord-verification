import type * as express from "express"
import {Status, inlineTryPromise, pick} from "@luke-zhang-04/utils"
import {decodeAndVerify, fetchWithTimeout} from "@luke-zhang-04/utils/node"
import {dataSchema} from "../schemas"

export const verify: express.RequestHandler<{
    data: string
}> = async (request, response) => {
    const {data: rawData} = request.params

    const data = await inlineTryPromise(
        async () =>
            await dataSchema.validate(
                decodeAndVerify(rawData, "sha384", process.env.HASH_TOKEN, "base64url"),
            ),
    )

    if (data instanceof Error) {
        return response.status(Status.BadRequest).json(pick(data, "message", "name"))
    }

    const res = await fetchWithTimeout(data.discord.avatarURL, {method: "GET", timeout: 2500})
    const img = await res.arrayBuffer()

    return response.status(Status.Ok).render("verify", {
        ...data.discord,
        avatarURL: `data:${res.headers.get("content-type")};base64,${Buffer.from(img).toString(
            "base64",
        )}`,
        email: data.email,
        name: "YOUR MOM",
        rawData,
    })
}

export default verify
