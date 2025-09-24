# --- TAHAP 1: BUILDER (Bengkel Perakitan) ---
# Di sini kita membangun aplikasi Next.js
FROM node:18-alpine AS builder

WORKDIR /app

# Salin daftar dependensi
COPY package*.json ./

# Install SEMUA dependensi (termasuk yang untuk build)
RUN npm install

# Salin sisa kode aplikasi
COPY . .

# Jalankan perintah build untuk menghasilkan folder .next
RUN npm run build


# --- TAHAP 2: PRODUCTION (Showroom) ---
# Di sini kita hanya mengambil hasil jadinya saja
FROM node:18-alpine

WORKDIR /app

# Set environment ke 'production'
ENV NODE_ENV=production

# Salin HANYA yang diperlukan dari tahap 'builder'
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# [Keamanan] Ganti ke user non-root
USER node

# Buka port 3000
EXPOSE 3000

# Perintah untuk menjalankan aplikasi
CMD ["npm", "start"]