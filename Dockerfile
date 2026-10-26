FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY client client
RUN npm run build
FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev
COPY server server
COPY --from=build /app/client/dist client/dist
EXPOSE 5000
CMD ["npm", "start"]
