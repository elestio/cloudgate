#Require Node.js12
FROM node:12-slim

RUN apt-get update && apt-get install -y git

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY * ./

RUN npm install

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "node", "cloudgate.js", "./apps/CatchAll" ]