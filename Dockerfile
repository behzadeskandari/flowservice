# Stage 1: Build Stage
FROM node:20-alpine as build-stage

# تنظیم پوشه کاری
WORKDIR /app

# کپی فایل‌های پکیج برای استفاده از Cache داکر
COPY package*.json ./

# نصب وابستگی‌ها
RUN npm install

# کپی کل کد پروژه
COPY . .

# بیلد کردن پروژه برای محیط Production
RUN npm run build

# Stage 2: Production Stage
FROM nginx:stable-alpine as production-stage

# کپی فایل‌های بیلد شده از مرحله قبل به پوشه Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# کپی تنظیمات اختصاصی Nginx برای پشتیبانی از Vue Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]