import type * as express from "express"
import {Status, inlineTryPromise, pick} from "@luke-zhang-04/utils"
import {dataSchema} from "../schemas"
import {decodeAndVerify} from "@luke-zhang-04/utils/node"
import qs from "query-string"

export const confirm: express.RequestHandler<{
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

    // Verification logic
    console.log(data)

    return response.status(Status.NoContent).redirect(
        `/success?${qs.stringify({
            ...data.discord,
            email: data.email,
            name: "YOUR MOM",
        })}`,
    )
}

export default confirm
