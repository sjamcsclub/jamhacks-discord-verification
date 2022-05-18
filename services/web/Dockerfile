FROM docker.io/node:16-slim

RUN apt-get update
RUN apt-get install -y git make g++ python3
RUN ln -sv /usr/local/bin/node /bin/node
RUN npm i -g pnpm@^7.1.1

COPY . .

RUN pnpm install --shamefully-hoist
RUN pnpm prisma generate
RUN pnpm build

# ENV must be placed after build steps
ENV NODE_ENV=production
ENV PORT=8333

RUN pnpm install --prod --no-optional --shamefully-hoist

CMD ["node", "--experimental-vm-modules", "--es-module-specifier-resolution=node", "."]
