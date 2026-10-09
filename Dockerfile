FROM oven/bun:1.3.10 AS bun

FROM node:22-bookworm-slim

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /workspace

COPY package.json bun.lock ./

# Fail early if the base image drifts outside Kashero's supported Node runtime.
RUN node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major !== 22 || minor < 13) throw new Error('Kashero requires Node.js >=22.13.0 <23');"

RUN bun install --frozen-lockfile --network-concurrency=8

COPY --chown=node:node . .

USER node

CMD ["bun", "run", "check"]
