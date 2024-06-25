# Use an official Node.js runtime as a parent image
FROM node:18.20.2

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the application code to the container
COPY . .

# Rebuild native modules like bcrypt
RUN npm rebuild bcrypt

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["node", "index.js"]
