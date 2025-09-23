// backend/routes/authRoutes.js (Versi Final)

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

// Endpoint registrasi (sudah ada)
router.post("/register", authController.register);

// Endpoint login (sudah ada)
router.post("/login", authController.login);

// Route baru untuk mengambil data pengguna yang sedang login
// PERBAIKAN: Menggunakan nama fungsi yang benar -> getMe
router.get("/me", auth, authController.getMe);

module.exports = router;
