FROM node:18-alpine

WORKDIR /app

# Copy package metadata
COPY package.json ./

# Install production deps
RUN npm install --omit=dev

# Copy rest of backend files
COPY . .

EXPOSE 14550/udp
EXPOSE 8081
EXPOSE 8082
EXPOSE 8083

CMD ["node", "start.js"]
