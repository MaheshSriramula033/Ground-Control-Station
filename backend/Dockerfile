FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy backend source
COPY . .

# Create non-root user
RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup
USER nodeuser

# Expose all backend ports
EXPOSE 3000
EXPOSE 14550/udp
EXPOSE 8081
EXPOSE 8082
EXPOSE 8083

# Start backend using start.js
CMD ["node", "start.js"]
