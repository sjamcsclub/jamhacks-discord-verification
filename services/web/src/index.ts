import "./dotenv"
import * as routes from "./routes"
import {Status, isErrorLike, pick} from "@luke-zhang-04/utils"
import compression from "compression"
import express from "express"
import {fileURLToPath} from "url"
import helmet from "helmet"
import mustacheExpress from "mustache-express"
import path from "path"
import ratelimit from "express-rate-limit"

const catcher =
    <
        P,
        ResBody,
        ReqBody,
        ReqQuery,
        Locals extends {[key: string]: unknown} = {[key: string]: unknown},
    >(
        handler: express.RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
    ): express.RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> =>
    async (request, response, next) => {
        try {
            await handler(request, response, next)
        } catch (err) {
            next(err)
        }
    }

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const app = express()

const mstEngine = mustacheExpress()

app.engine("mustache", mstEngine)

app.set("view engine", "mustache")
app.set("views", `${dirname}/views`)

app.set("view engine", "mustache")
app.set("views", path.join(dirname, "../templates"))

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

app.use("/static", express.static(path.join(dirname, "../static")))

app.get("/", (_, response) =>
    response.status(Status.Ok).sendFile(path.join(dirname, "../static/index.html")),
)

app.get("/verify/:data", catcher(routes.verify))

app.use((_, response) =>
    response
        .status(Status.NotFound)
        .render("error", {name: "404", message: "The page you are looking for does not exist"}),
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: express.ErrorRequestHandler = (error, _req, response, _next) =>
    response.render(
        "error",
        isErrorLike(error) ? pick(error, "name", "message") : {message: String(error)},
    )

app.use(errorHandler)

export default app
