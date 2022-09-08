FROM node:10

WORKDIR /home/node/app

RUN npm install

USER node

EXPOSE 8080

CMD [ "node", "index.js" ]