# Use official Node image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your code
COPY . .

# Expose the port your server listens on
EXPOSE 8080

# Run your app using the npm start script
CMD ["npm", "start"]
