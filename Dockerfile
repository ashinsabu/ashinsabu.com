# Use an official Node.js image as the base image for building
FROM node:20 AS builder

WORKDIR /app
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

# Use an official Nginx image as the base image for serving content
FROM nginx:1.21.1-alpine

# Remove the default Nginx content
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/nginx/nginx.conf /etc/nginx/nginx.conf

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
