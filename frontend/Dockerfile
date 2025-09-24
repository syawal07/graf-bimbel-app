# --- TAHAP 1: BUILDER (Bengkel Perakitan) ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install SEMUA dependensi untuk build
RUN npm install
COPY . .
RUN npm run build


# --- TAHAP 2: PRODUCTION (Showroom) ---
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Salin package.json untuk instalasi dependensi produksi
COPY --from=builder /app/package*.json ./

# [OPTIMASI] Install HANYA dependensi produksi
RUN npm ci --only=production

# Salin hasil build dari tahap builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# [Keamanan] Ganti ke user non-root
USER node

EXPOSE 3000

CMD ["npm", "start"]