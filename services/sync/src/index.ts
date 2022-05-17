import "./dotenv"
import * as yup from "yup"
import {GoogleSpreadsheet, type GoogleSpreadsheetRow} from "google-spreadsheet"
import {Status, pick} from "@luke-zhang-04/utils"
import db from "./db"
import {fetchWithTimeout} from "@luke-zhang-04/utils/node"
import prisma from "@prisma/client"

// TODO: sync other fields

const rowSchema = yup.object({
    name: yup.string().required(),
    email: yup.string().email().required(),
    inPerson: yup.string().oneOf(["Yes", "No", ""]),
    discordAccount: yup.string(),
    discordID: yup.string(),
})

type ValidatedRow = GoogleSpreadsheetRow & typeof rowSchema.__outputType

const validateRows = async (rawRow: GoogleSpreadsheetRow[]): Promise<ValidatedRow[]> => {
    const lastEntry = rawRow.findIndex((row) => !row.email)

    return (await yup
        .array(rowSchema)
        .required()
        .validate(rawRow.slice(0, lastEntry))) as ValidatedRow[]
}

interface TransformedRow {
    raw: ValidatedRow
    name: string
    email: string
    discordAccount?: string
    discordUserId?: string
    isInPerson: boolean
}

const transformRow = (row: ValidatedRow): TransformedRow => ({
    raw: row,
    name: row.name,
    email: row.email,
    discordAccount: row.discordAccount,
    discordUserId: row.discordID,
    isInPerson: row.inPerson === "Yes",
})

const doc = new GoogleSpreadsheet("1qV-kGBid84eFTlZFNFUGHVFrTWJdI-mtJRgpIPpZDSc")

await doc.useServiceAccountAuth({
    client_email: "jamify@jamhacks-6-verification.iam.gserviceaccount.com",
    private_key: process.env.GOOGLE_PRIVATE_KEY,
})

await doc.loadInfo()

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const sheet = doc.sheetsByIndex[0]!

const getDiscordUid = async (
    username: string,
    discriminator: string | number,
): Promise<string | undefined> => {
    const request = await fetchWithTimeout(
        `http://localhost:8383/getUserId/${username}/${discriminator}`,
        {
            method: "GET",
            // timeout: 1000,
        },
    )

    if (request.ok) {
        return ((await request.json()) as {id: string})?.id
    } else if (request.status !== Status.NotFound) {
        console.error("ERROR", (await request.text()) || request.status)
    }

    return undefined
}

const getDiscordUsername = async (
    uid: string,
): Promise<[username: string, discriminator: string] | undefined> => {
    const request = await fetchWithTimeout(`http://localhost:8383/getUsername/${uid}`, {
        method: "GET",
        // timeout: 1000,
    })

    if (request.ok) {
        const response = (await request.json()) as {username: string; discriminator: string}

        return [response.username, response.discriminator]
    } else if (request.status !== Status.NotFound) {
        console.error("ERROR", (await request.text()) || request.status)
    }

    return undefined
}

const getDiscordInfo = async (
    row: TransformedRow,
): Promise<{
    userData: [username: string, discriminator: string] | undefined
    uid: string | undefined
}> => {
    let userData = row.discordAccount
        ? (row.discordAccount.split("#") as [username: string, discriminator: string])
        : undefined
    let uid = row.discordUserId

    if (uid) {
        if (!userData) {
            const newUserData = await getDiscordUsername(uid)

            if (newUserData) {
                userData = newUserData
            }
        }
    } else if (userData) {
        uid = await getDiscordUid(...userData)
    }

    return {userData, uid}
}

const pull = async (row: TransformedRow): Promise<void> => {
    // Check for manually inserted usernames

    const existing = await db.participant.findUnique({
        where: {
            email: row.email,
        },
        include: {discord: true},
    })

    if (existing) {
        if ((row.discordAccount || row.discordUserId) && !existing.discord) {
            const {userData, uid} = await getDiscordInfo(row)

            if (uid && userData) {
                await db.discordUser.upsert({
                    where: {
                        email: row.email,
                    },
                    update: {
                        username: userData?.[0],
                        discriminator: userData?.[1],
                        uid,
                    },
                    create: {
                        username: userData?.[0],
                        discriminator: userData?.[1],
                        uid,
                        email: row.email,
                    },
                })
            }
        }
    } else {
        const {userData, uid} = await getDiscordInfo(row)

        await db.participant.create({
            data: {
                ...pick(row, "email", "name", "isInPerson"),
                discord:
                    userData && uid
                        ? {
                              create: {
                                  username: userData[0],
                                  discriminator: userData[1],
                                  uid,
                              },
                          }
                        : undefined,
            },
        })
    }
}

const push = async (
    dbParticipant: prisma.Participant & {
        discord: prisma.DiscordUser | null
    },
    rows: TransformedRow[],
): Promise<
    Partial<Exclude<typeof rowSchema.__outputType, "email" | "name" | "inPerson">> | undefined
> => {
    const sheetParticipant = rows.find((row) => row.email === dbParticipant.email)

    if (!sheetParticipant) {
        return {
            discordAccount: dbParticipant.discord
                ? `${dbParticipant.discord.username}#${dbParticipant.discord.discriminator}`
                : "",
            discordID: dbParticipant.discord?.uid ?? "",
        }
    }

    let didChange = false

    if (!sheetParticipant.discordAccount && dbParticipant.discord) {
        sheetParticipant.raw.discordAccount = `${dbParticipant.discord.username}#${dbParticipant.discord.discriminator}`
        didChange = true
    }
    if (!sheetParticipant.discordUserId) {
        if (dbParticipant.discord?.uid) {
            sheetParticipant.raw.discordID = dbParticipant.discord.uid
            didChange = true
        } else if (dbParticipant.discord) {
            const uid = await getDiscordUid(
                dbParticipant.discord.username,
                dbParticipant.discord.discriminator,
            )

            if (uid) {
                sheetParticipant.raw.discordID = uid
                didChange = true
            }
        }
    }

    if (didChange) {
        await sheetParticipant.raw.save()
    }

    return
}

const sync = async (): Promise<void> => {
    console.log("Syncing")
    try {
        doc.resetLocalCache()
        await doc.loadInfo()
        console.log("loaded")

        const rawRows = await sheet.getRows()
        const rawRowData = await validateRows(rawRows)
        const rows = rawRowData.map(transformRow)

        console.log("pulling")

        await Promise.all(rows.map((row) => pull(row)))

        console.log("Pulling complete, pushing to spreadsheet")

        const newRows = (
            await Promise.all(
                (
                    await db.participant.findMany({
                        include: {
                            discord: true,
                        },
                    })
                ).map((participant) => push(participant, rows)),
            )
        ).filter((val): val is Exclude<typeof val, undefined> => val !== undefined)

        await sheet.addRows(newRows)

        await sheet.saveUpdatedCells()
    } catch (err) {
        console.error(err)
    }
    console.log("Finished sync")
}

await sync()

const interval = setInterval(async () => {
    await sync()
}, Number(process.env.SYNC_MS) || 3_600_000)

process.on("exit", () => clearInterval(interval))
process.on("beforeExit", () => clearInterval(interval))
process.on("SIGINT", () => clearInterval(interval))
