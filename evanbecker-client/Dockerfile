FROM node:16-alpine

ENV PORT 3000

# Creating the app folder and setting up as WORKDIR
RUN mkdir /app
WORKDIR /app

# Getting package.json and others to install all the required Node packages
COPY ./evanbecker-client/package*.json /app/
RUN npm install

# Copying and building our app to production
COPY ./evanbecker-client/ /app/
RUN ./evanbecker-client/transform-env.sh
RUN npm run build

# Finally, exposing and running our app inside our container
EXPOSE 3000

CMD "npm" "start"