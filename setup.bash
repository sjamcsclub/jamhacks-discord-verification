#!/bin/bash
# Setup repo for development

__dirname="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)"

PS4='\033[0;32m > \033[0m'
set -o xtrace pipefail -e

if ! [[ "$(pnpm -v)" ]]; then
    npm i -g pnpm
fi

for filename in "${__dirname}"{/services/*,}/.env.gpg; do
    gpg "$filename"
done

pnpm install

pnpm prismaGenerate -r
