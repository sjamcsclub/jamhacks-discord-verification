declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV?: "development" | "production"
            HASH_TOKEN: string
            DB_URL: string
        }
    }
}

export {}
