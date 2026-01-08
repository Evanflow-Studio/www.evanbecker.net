FROM node:20-alpine

ENV PORT 3000

RUN mkdir /app
WORKDIR /app

COPY ./evanbecker-client/package*.json /app/
RUN npm install

COPY ./evanbecker-client/ /app/
RUN npm run build

EXPOSE 3000

CMD "npm" "start"