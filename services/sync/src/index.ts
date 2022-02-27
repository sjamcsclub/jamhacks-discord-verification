import "./dotenv"
import * as yup from "yup"
import {GoogleSpreadsheet, type GoogleSpreadsheetRow} from "google-spreadsheet"
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
}

const transformRow = (row: ValidatedRow): TransformedRow => ({
    raw: row,
    name: row.Name,
    email: row.Email,
    role: row.Role as prisma.Role,
    discordAccount: row["Discord Account"],
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
        return ((await request.json()) as {id: string}).id
    }
    console.error(await request.text())

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

            if (uid) {
                await db.discordUser.upsert({
                    where: {
                        email: row.email,
                    },
                    update: {
                        username: userData[0],
                        discriminator: Number(userData[1]),
                        uid,
                    },
                    create: {
                        username: userData[0],
                        discriminator: Number(userData[1]),
                        uid,
                        email: row.email,
                    },
                })
            }
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
                discord:
                    userData && uid
                        ? {
                              create: {
                                  username: userData[0],
                                  discriminator: Number(userData[1]),
                                  uid,
                              },
                          }
                        : undefined,
            },
        })
    }
}

const push = async (
    participant: prisma.Participant & {
        discord: prisma.DiscordUser | null
    },
    rows: TransformedRow[],
): Promise<Defined<typeof rowSchema.__outputType> | undefined> => {
    const participantRow = rows.find((row) => row.email === participant.email)

    if (!participantRow) {
        return {
            Name: participant.name,
            Email: participant.email,
            Role: participant.role ?? "",
            "Discord Account": participant.discord
                ? `${participant.discord.username}#${participant.discord.discriminator}`
                : "",
        }
    }
    if (!participantRow.discordAccount && participant.discord) {
        participantRow.raw[
            "Discord Account"
        ] = `${participant.discord.username}#${participant.discord.discriminator}`

        await participantRow.raw.save()
    }

    return
}

const sync = async (): Promise<void> => {
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
}

await sync()

setInterval(async () => {
    await sync()
}, Number(process.env.SYNC_MS) ?? 3_600_000)
