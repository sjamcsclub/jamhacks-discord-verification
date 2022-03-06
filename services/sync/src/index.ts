import "./dotenv"
import * as yup from "yup"
import {GoogleSpreadsheet, type GoogleSpreadsheetRow} from "google-spreadsheet"
import {Status} from "@luke-zhang-04/utils"
import db from "./db"
import fetch from "node-fetch"
import prisma from "@prisma/client"

// TODO: sync other fields

type Defined<T> = {[P in keyof T]-?: Exclude<T[P], undefined>}

const rowSchema = yup.object({
    Name: yup.string().required(),
    Email: yup.string().email().required(),
    Role: yup.string().oneOf(Object.keys(prisma.Role) as (keyof typeof prisma.Role)[]),
    "Discord Account": yup.string(),
    "Discord User ID": yup.string(),
})

type ValidatedRow = GoogleSpreadsheetRow & typeof rowSchema.__outputType

const validateRows = async (rawRow: GoogleSpreadsheetRow[]): Promise<ValidatedRow[]> =>
    (await yup.array(rowSchema).required().validate(rawRow)) as ValidatedRow[]

interface TransformedRow {
    raw: ValidatedRow
    name: string
    email: string
    role?: prisma.Role
    discordAccount?: string
    discordUserId?: string
}

const transformRow = (row: ValidatedRow): TransformedRow => ({
    raw: row,
    name: row.Name,
    email: row.Email,
    role: row.Role as prisma.Role,
    discordAccount: row["Discord Account"],
    discordUserId: row["Discord User ID"],
})

const doc = new GoogleSpreadsheet("1nMKbyD4OppQBVQUjYroC_8YK49Xr5nE8yvIYP-ZuORI")

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
    const request = await fetch(`http://localhost:8383/getUser/${username}/${discriminator}`, {
        method: "GET",
    })

    if (request.ok) {
        return ((await request.json()) as {id: string})?.id
    } else if (request.status !== Status.NotFound) {
        console.error("ERROR", (await request.text()) || request.status)
    }

    return undefined
}

const pull = async (row: TransformedRow): Promise<void> => {
    const existing = await db.participant.findUnique({
        where: {
            email: row.email,
        },
        include: {discord: true},
    })

    if (existing) {
        // Check for manually inserted usernames
        if (row.discordAccount && !existing.discord) {
            const userData = row.discordAccount.split("#") as
                | [username: string, discriminator: string]
            const uid = await getDiscordUid(...userData)

            await db.discordUser.upsert({
                where: {
                    email: row.email,
                },
                update: {
                    username: userData[0],
                    discriminator: userData[1],
                    uid,
                },
                create: {
                    username: userData[0],
                    discriminator: userData[1],
                    uid,
                    email: row.email,
                },
            })
        }
    } else {
        const userData = row.discordAccount?.split("#") as
            | [username: string, discriminator: string]
            | undefined
        const uid = userData ? await getDiscordUid(...userData) : undefined

        await db.participant.create({
            data: {
                email: row.email,
                name: row.name,
                role: row.role,
                discord: userData
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
): Promise<Defined<typeof rowSchema.__outputType> | undefined> => {
    const sheetParticipant = rows.find((row) => row.email === dbParticipant.email)

    if (!sheetParticipant) {
        return {
            Name: dbParticipant.name,
            Email: dbParticipant.email,
            Role: dbParticipant.role ?? "",
            "Discord Account": dbParticipant.discord
                ? `${dbParticipant.discord.username}#${dbParticipant.discord.discriminator}`
                : "",
            "Discord User ID": dbParticipant.discord?.uid ?? "",
        }
    }

    let didChange = false

    if (!sheetParticipant.discordAccount && dbParticipant.discord) {
        sheetParticipant.raw[
            "Discord Account"
        ] = `${dbParticipant.discord.username}#${dbParticipant.discord.discriminator}`
        didChange = true
    }
    if (!sheetParticipant.discordUserId) {
        if (dbParticipant.discord?.uid) {
            sheetParticipant.raw["Discord User ID"] = dbParticipant.discord.uid
            didChange = true
        } else if (dbParticipant.discord) {
            const uid = await getDiscordUid(
                dbParticipant.discord.username,
                dbParticipant.discord.discriminator,
            )

            if (uid) {
                sheetParticipant.raw["Discord User ID"] = uid
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
    doc.resetLocalCache()
    await doc.loadInfo()

    const rawRows = await sheet.getRows()
    const rawRowData = await validateRows(rawRows)
    const rows = rawRowData.map(transformRow)

    await Promise.all(rows.map((row) => pull(row)))

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
    console.log("Finished sync")
}

await sync()

setInterval(async () => {
    await sync()
}, Number(process.env.SYNC_MS) || 3_600_000)
