# Stage 1: Build Stage
# Changed 'as' to 'AS' to match 'FROM' casing
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files
COPY package*.json ./

# npm ci is preferred in Docker as it installs exact versions from package-lock.json
# If you run into issues, you can stick with: RUN npm install --legacy-peer-deps
RUN npm ci --legacy-peer-deps

# Copy project files
COPY . .

# Build the project
RUN npm run build

# Stage 2: Production Stage
FROM nginx:stable-alpine AS production-stage

# Copy build artifacts from build-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]