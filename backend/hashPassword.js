// file: backend/hashPassword.js

const bcrypt = require("bcryptjs");

// Mengambil password dari argumen ketiga di terminal
// Contoh: node hashPassword.js passwordnya_disini
const password = process.argv[2];

if (!password) {
  console.error("Error: Mohon masukkan password setelah nama file.");
  console.log("Contoh Penggunaan: node hashPassword.js admin123");
  process.exit(1); // Keluar jika tidak ada password
}

// Proses hashing menggunakan library yang sama dengan aplikasi Anda
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log("Password Asli:", password);
console.log("Hasil Hash (untuk disalin):", hash);
