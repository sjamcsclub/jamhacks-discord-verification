declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production"
            DISCORD_AUTH_TOKEN: string
            DISCORD_CLIENT_ID: string
            HASH_TOKEN: string
        }
    }
}

export {}
