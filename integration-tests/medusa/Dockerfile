FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/medusa

COPY package.json ./
RUN npm install --no-audit --no-fund

# Install the POS plugin by extracting its tarball straight into node_modules.
# This keeps it out of npm's dependency resolver, which otherwise backtracks
# forever over Medusa's peer-dependency graph.
COPY narisolutions-medusa-plugin-pos-0.1.0.tgz ./
RUN mkdir -p "node_modules/@narisolutions/medusa-plugin-pos" \
 && tar -xzf narisolutions-medusa-plugin-pos-0.1.0.tgz -C "node_modules/@narisolutions/medusa-plugin-pos" --strip-components=1

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]
