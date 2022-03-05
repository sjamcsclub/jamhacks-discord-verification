#!/bin/bash

set -o pipefail -e

__dirname="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)"

addDate() {
    while IFS= read -r line; do
        printf "%s | %s\n" "$(date +"%b %e %H:%M:%S %Z $(hostname)")" "$line";
    done
}

# Log logs stdin to a log file in ./logs
# NOTE: All logs must have a trailing newline
# PARAMS:
#     1 - fileName - required - filename of log
#     2 - quiet - optional - if true, logs will not be printed to stdout - default false
log() {
    output=""

    if ! [[ -d "${__dirname}/logs" ]]; then
        mkdir "${__dirname}/logs"
    fi

    while IFS= read -r line; do
        printf "%s\n" "$line" | sed 's/\x1b\[[0-9;]*m//g' | addDate >> "${__dirname}/logs/${1}.log"
        output="${output}${line}\n"
    done

    if ! [[ "${2}" ]]; then
        echo -e "$output"
    fi
}

onExit() {
    /bin/docker-compose -f "${__dirname}/docker-compose.yml" down 2>&1 | log "log"
}

trap onExit SIGINT SIGTERM

/bin/docker-compose -f "${__dirname}/docker-compose.yml" up --abort-on-container-exit 2>&1 | log "log"
