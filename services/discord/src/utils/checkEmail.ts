import * as yup from "yup"
import {fetchWithTimeout} from "@luke-zhang-04/utils/node"

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

    return await checkDisposable(email)
}
