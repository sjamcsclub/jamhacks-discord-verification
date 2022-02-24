import {SESClient, type SESClientConfig} from "@aws-sdk/client-ses"

const config: SESClientConfig = {
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    apiVersion: "2022-02-21",
    region: "us-east-1",
}

export const ses = new SESClient(config)
