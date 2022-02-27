import prismaClient from "@prisma/client"

export const prisma = new prismaClient.PrismaClient()

export {prisma as db}

/* eslint-disable @typescript-eslint/no-empty-function */
process.on("exit", () => prisma.$disconnect().catch(() => {}))
process.on("beforeExit", () => prisma.$disconnect().catch(() => {}))
process.on("SIGINT", () => prisma.$disconnect().catch(() => {}))
/* eslint-enable @typescript-eslint/no-empty-function */

export default prisma
