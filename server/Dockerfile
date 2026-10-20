FROM mcr.microsoft.com/playwright:v1.50.1-noble

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and tsconfig
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to dist
RUN npm run build

# Expose port
ENV PORT=3001
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=192"
EXPOSE 3001

# Start server
CMD ["npm", "start"]
