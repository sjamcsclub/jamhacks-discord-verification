import type * as express from "express"
import * as yup from "yup"
import {Status, inlineTryPromise, pick} from "@luke-zhang-04/utils"

const querySchema = yup.object({
    username: yup.string().required(),
    discriminator: yup.string().required(),
    email: yup.string().required(),
    name: yup.string().required(),
})

export const success: express.RequestHandler = async (request, response) => {
    const query = await inlineTryPromise(async () => await querySchema.validate(request.query))

    if (query instanceof Error) {
        return response.status(Status.BadRequest).json(pick(query, "message", "name"))
    }

    return response.status(Status.Ok).render("success", query)
}

export default success
