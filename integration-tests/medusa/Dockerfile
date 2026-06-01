FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/medusa

# The POS plugin (@narisolutions/medusa-plugin-pos) is a normal dependency in
# package.json, installed straight from the npm registry. The old tarball-extract
# workaround was only needed for `npm install <local-tarball-file>`, which hung on
# Medusa's peer-dep graph; registry resolution by name+version installs cleanly.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]
