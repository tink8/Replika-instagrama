FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Pravimo folder za upload slika unutar kontejnera
RUN mkdir -p uploads

EXPOSE 8003

CMD ["node", "index.js"]