# Dev-mode container: runs the Vite dev server (HMR) for the MVP demo.
# A production build would use `vite build` + a static file server / nginx.
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
