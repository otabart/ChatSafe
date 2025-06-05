# Use an official Node.js runtime as a parent image
# Using Node 18 as it's a common LTS version. Adjust if needed.
FROM node:18-slim

LABEL maintainer="ChatSafe Development Team"
LABEL description="ChatSafe XMTP Moderation Agent"

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock if using Yarn)
# This step leverages Docker layer caching. Only re-runs if these files change.
COPY package*.json ./

# Install app dependencies
# Using npm ci for cleaner installs, prefer over npm install for production builds
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Transpile TypeScript to JavaScript.
# Ensure your tsconfig.json specifies an outDir, e.g., "outDir": "./dist"
# and that your package.json has a "build" script like "build": "tsc"
RUN npm run build

# The agent doesn't typically expose a port unless it has an HTTP health check endpoint.
# If you add one (e.g., on port 3000), uncomment the line below:
# EXPOSE 3000

# Define the command to run your app
# This assumes your compiled JavaScript entry point is dist/index.js
CMD [ "node", "dist/index.js" ]
