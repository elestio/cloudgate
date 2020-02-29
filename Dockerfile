#Require Node.js12
FROM node:12

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY * ./

RUN npm install

# Bundle app source
COPY . .

EXPOSE 80
CMD [ "node", "index.js" ]