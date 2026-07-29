# Stage 1: Build the frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.base.json ./
COPY nx.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the source code and shared libs needed for compilation
COPY apps/frontend ./apps/frontend
COPY libs ./libs

# Build the frontend application
RUN npx nx build frontend --configuration=production

# Stage 2: Serve the frontend using Nginx
FROM nginx:1.25-alpine

# Copy custom nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files from builder stage to nginx server directory
COPY --from=builder /app/dist/apps/frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
