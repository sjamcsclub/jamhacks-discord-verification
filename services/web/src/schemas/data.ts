import * as yup from "yup"

export const dataSchema = yup.object({
    discord: yup.object({
        username: yup.string().required(),
        discriminator: yup.number().required(),
        userId: yup.string().required(),
        avatarURL: yup.string().required(),
    }),
    email: yup
        .string()
        .transform((email) => (typeof email === "string" ? email.toLowerCase() : email))
        .required(),
    iss: yup
        .number()
        .test(
            "is-not-expired",
            (val, ctx) =>
                (val && Date.now() - val < 1 * 60 * 60 * 1000) ||
                process.env.NODE_ENV === "development" ||
                ctx.createError({message: "This verification token has been expired"}),
        )
        .required(),
})

export default dataSchema
