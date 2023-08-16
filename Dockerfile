FROM node:20.5.0-alpine3.14

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package.json ./

RUN npm install 

# Bundle app source
COPY . .

EXPOSE 5173

CMD [ "npm", "run", "start" ]