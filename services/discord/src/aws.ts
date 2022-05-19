import {LambdaClient, LambdaClientConfig} from "@aws-sdk/client-lambda"
import {LambdaSes} from "lambda-ses"

const config: LambdaClientConfig = {
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    apiVersion: "2022-02-21",
    region: "us-east-1",
}

export const lambda = new LambdaClient(config)
export const lambdaSes = new LambdaSes(lambda, "lambda-ses")
