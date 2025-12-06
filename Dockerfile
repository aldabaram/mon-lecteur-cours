FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY server.js .
COPY public ./public
COPY cours ./cours

EXPOSE 3000

CMD ["node", "server.js"]
