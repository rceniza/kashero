FROM node:22-bookworm-slim

WORKDIR /workspace

COPY package.json package-lock.json ./

# Fail early if the base image drifts outside Kashero's supported Node runtime.
RUN node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major !== 22 || minor < 13) throw new Error('Kashero requires Node.js >=22.13.0 <23');"

RUN npm ci --no-audit --no-fund

COPY --chown=node:node . .

USER node

CMD ["npm", "run", "check"]
