declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: "development" | "production"
            DB_URL: string
            GOOGLE_PRIVATE_KEY: string
        }
    }
}

export {}
