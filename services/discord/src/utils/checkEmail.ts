import * as yup from "yup"
import {fetchWithTimeout} from "@luke-zhang-04/utils/node"
import mailcheck from "mailcheck"

type Suggestion = {
    address: string
    domain: string
    full: string
}

const checkTypo = (email: string): Promise<string | undefined> =>
    new Promise((resolve) =>
        mailcheck.run({
            email,
            suggested: (suggestion: Suggestion) =>
                resolve(`Likely typo, suggested: ${suggestion.full}`),
            empty: () => resolve(undefined),
        }),
    )

const checkDisposable = async (email: string): Promise<string | undefined> => {
    const result = (await (
        await fetchWithTimeout(`https://open.kickbox.com/v1/disposable/${email}`, {
            method: "GET",
            timeout: 2500,
        })
    ).json()) as {disposable: boolean}

    return result.disposable ? "Email was created from a disposable domain" : undefined
}

export const checkEmail = async (email: string): Promise<string | undefined> => {
    if (!(await yup.string().email().isValid(email))) {
        return "Given email is not a valid email"
    }

    const typoRes = await checkTypo(email)

    if (typoRes) {
        return typoRes
    }

    const disposableRes = await checkDisposable(email)

    return disposableRes
}
