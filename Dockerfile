FROM node:18

EXPOSE 2567

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 2567

CMD [ "npm", "run", "build", "&&", "npm", "start" ]
