# Use Node.js 20 Alpine as base
FROM node:22-slim

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose Next.js port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
