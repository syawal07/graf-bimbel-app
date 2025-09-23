const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
const contentController = require("../controllers/contentController");

// =================================================================
// RUTE KONTEN PUBLIK
// =================================================================

// Route untuk mengambil semua paket yang ditampilkan di beranda
router.get("/packages", publicController.getPublicPackages);
router.get("/packages/:id", publicController.getPackageById);

// Route untuk mengambil data Keunggulan (Advantages) dan FAQ
router.get("/advantages", contentController.getAdvantages);
router.get("/faqs", contentController.getFaqs);

// Route untuk mengambil data hero slider yang aktif
router.get("/hero-slides", contentController.getHeroSlides);

// =================================================================
// == [BARU] RUTE UNTUK METODE PEMBAYARAN
// =================================================================
/**
 * @description Endpoint publik untuk mengambil metode pembayaran yang aktif.
 * @route GET /api/public/payment-methods
 */
router.get("/payment-methods", contentController.getPublicPaymentMethods);

// =================================================================
// RUTE PENGATURAN SITUS PUBLIK
// =================================================================

/**
 * @description [DIPERBARUI] Endpoint publik untuk mengambil SEMUA pengaturan situs
 * (logo, link registrasi, footer, dll) dalam satu panggilan API.
 * @route GET /api/public/settings
 */
router.get("/settings", contentController.getPublicSettings);

module.exports = router;
