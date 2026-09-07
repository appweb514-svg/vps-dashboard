FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY api ./api
COPY benchmark ./benchmark
COPY data ./data
ENV HOST=0.0.0.0 PORT=3001
EXPOSE 3001
CMD ["npx","tsx","api/server.ts"]
