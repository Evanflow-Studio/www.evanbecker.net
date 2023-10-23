FROM node:16-alpine

ARG NEXT_PUBLIC_SITE_URL
ENV SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN env

ENV PORT 3000

# Creating the app folder and setting up as WORKDIR
RUN mkdir /app
WORKDIR /app

# Getting package.json and others to install all the required Node packages
COPY ./evanbecker-client/package*.json /app/
RUN npm install

# Copying and building our app to production
COPY ./evanbecker-client/ /app/
RUN chmod u+x ./transform-env.sh
RUN ./transform-env.sh
RUN npm run build

# Finally, exposing and running our app inside our container
EXPOSE 3000

CMD "npm" "start"