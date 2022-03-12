# JAMHacks 6 Verification

## How it Works

1. The user sends a command to the Discord bot with the email they claim to have used
2. The bot uses AWS SES to send the email using Mustache templates and Juice to inline CSS
    - The email contains a link to `verify.jamhacks.ca/verify/:data`, where data is essentially a glorified JWT token encoded with `base64-url` and signed with HMAC SHA to ensure the integrity of the data
3. The user clicks the link in their email
4. The link data is verified and decoded, and using Mustache templates, a response is rendered from the server
5. The user's Discord details are added to the database
6. The Discord service also runs a simple HTTP server locally. A request is given to this server so roles and nickname of the user can be changed, and a DM is sent to the user

## Developing

-   This codebase is organized as a monorepo, with the usual `packages` directory replaced with `services`
-   Typescript

### Setup

-   Run the setup script `./setup.bash`. If you can't, follow the below steps
    -   Packages are managed with `pnpm`. Install with `npm i -g pnpm` if you haven't already
    -   Run `pnpm install` to install dependencies
    -   All `.env` files are encrypted with gpg. You can decrypt with `gpg .env.gpg` and enter the password
    -   The Prisma client needs to be built and rebuilt with every migration. You can do this with `pnpm prismaGenerate -r`

### Services

-   Discord: The Discord bot lives here. There's an HTTP server which only runs on localhost, which is used to complete the verification process by assigning roles and nicknames, and can be used to fetch user info.
-   Web: the web page that runs on Mustache templates and ExpressJS for SSR
-   Sync: Periodically syncs the spreadsheet(s) with the database. This approach is used because interactions with the spreadsheet may be rate limited and/or slow.
