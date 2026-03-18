FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm ci
RUN npm run build

# Build backend (copies frontend dist into backend/dist/static)
WORKDIR /app/backend
RUN npm ci
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
