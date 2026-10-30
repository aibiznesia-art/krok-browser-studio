FROM node:22-alpine
WORKDIR /app
COPY package.json server.js index.html styles.css app.js manus-routes.json public ./
COPY agents ./agents
COPY social-sources.json SOCIAL-SOURCES.md README.md ./
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
