# /be/Dockerfile

# Gunakan base image yang spesifik dan kecil
FROM node:18-alpine

# Set environment variable ke 'production'
# Ini akan membuat beberapa library berjalan lebih cepat dan memberitahu npm
# untuk tidak menginstal devDependencies secara default.
ENV NODE_ENV=production

# Tentukan direktori kerja di dalam kontainer
WORKDIR /app

# Salin package.json dan package-lock.json terlebih dahulu
# Ini memanfaatkan Docker cache. Jika file ini tidak berubah,
# Docker tidak akan menjalankan 'npm install' lagi.
COPY package*.json ./

# Gunakan 'npm ci' untuk instalasi yang lebih cepat dan konsisten di server
# '--only=production' memastikan hanya dependensi produksi yang diinstal
# Ini membuat ukuran image lebih kecil.
RUN npm ci --only=production

# Salin sisa kode aplikasi Anda
COPY . .

# Beri tahu Docker bahwa aplikasi berjalan di port 3000 (ganti jika perlu)
EXPOSE 3000

# [Keamanan] Ganti ke user non-root bawaan dari image Node.js
USER node

# Perintah untuk menjalankan aplikasi Anda
CMD ["node", "server.js"]