# Backup deploy option (use if your host has no g++). Build context = project root.
FROM node:20-bookworm
WORKDIR /app
COPY backend ./backend
COPY cpp-engine ./cpp-engine
RUN cd backend && npm install --omit=dev && npm run build:cpp
WORKDIR /app/backend
ENV PORT=5000
CMD ["npm", "start"]
