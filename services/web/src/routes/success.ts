import type * as express from "express"
import * as yup from "yup"
import {Status} from "@luke-zhang-04/utils"

const querySchema = yup.object({
    username: yup.string().required(),
    discriminator: yup.string().required(),
    email: yup.string().required(),
    name: yup.string().required(),
})

export const success: express.RequestHandler = async (request, response) => {
    const query = await querySchema.validate(request.query)

    return response.status(Status.Ok).render("success", query)
}

export default success
