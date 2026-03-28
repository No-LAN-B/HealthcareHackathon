FROM node:20-alpine
WORKDIR /app
ENV VITE_API_URL=https://hh-backend-dxl9.onrender.com
COPY package*.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
