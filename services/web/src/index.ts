import {Status} from "@luke-zhang-04/utils"
import compression from "compression"
import express from "express"
import {fileURLToPath} from "url"
import helmet from "helmet"
import mustacheExpress from "mustache-express"
import path from "path"
import ratelimit from "express-rate-limit"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const app = express()

const mstEngine = mustacheExpress()

app.engine("mustache", mstEngine)

app.set("view engine", "mustache")
app.set("views", __dirname + "/views")

app.set("view engine", "mustache")
app.set("views", path.join(__dirname, "../templates"))

app.use(
    express.json(),
    helmet(),
    ratelimit({
        windowMs: 1 * 60 * 1000,
        max: 250,
        draft_polli_ratelimit_headers: true,
        handler: (_, response) =>
            response.status(Status.TooManyRequests).json({
                message: "You are being rate limited.",
            }),
    }),
    compression(),
)

app.get("/", (_, response) => response.status(Status.Ok).render("index"))
app.use("/static", express.static(path.join(__dirname, "../static")))

export default app
