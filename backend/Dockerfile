# Use lightweight production Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy rest of the backend source
COPY . .

# Expose UDP + WebSocket ports
EXPOSE 14550/udp
EXPOSE 8081
EXPOSE 8082
EXPOSE 8083

# Start the Enhanced GCS backend
CMD ["node", "start.js"]
