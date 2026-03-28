FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]

# Note on RSA Keys and Environment Variables:
# Because the API Gateway code references `../../keys/public.pem` and `../.env`,
# you will need to mount these files into the container at runtime using Docker Compose.
# Example docker-compose.yml configuration for this service:
# volumes:
#   - ../keys:/usr/src/keys
#   - ../.env:/usr/src/.env