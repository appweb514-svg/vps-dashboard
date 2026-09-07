FROM node:22-alpine AS build
WORKDIR /app
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
