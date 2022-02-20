#!/bin/node

import app from "./lib"

// Default to production env if none given
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production"
}

const defaultPort = 3333
const port =
    process.env.PORT !== undefined && process.env.PORT !== "default"
        ? Number(process.env.PORT)
        : defaultPort

const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

process.on("exit", () => server.close())
process.on("beforeExit", () => server.close())
process.on("SIGINT", () => server.close())

export default app
