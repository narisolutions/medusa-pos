FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app/medusa

COPY package.json ./
RUN npm install

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]
