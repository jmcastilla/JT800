FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV UDP_HOST=0.0.0.0
ENV UDP_PORT=9007
EXPOSE 9007
CMD ["node","server.js"]
