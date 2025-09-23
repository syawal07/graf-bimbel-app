// backend/routes/studentRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const studentController = require("../controllers/studentController");
const upload = require("../middleware/upload");

// Rute untuk dashboard utama siswa
router.get("/", auth, (req, res) => {
  res.status(200).json({ message: "Welcome to the student dashboard." });
});

// Rute untuk jadwal
router.get("/my-schedules", auth, studentController.getMySchedules);
router.get("/my-session-history", auth, studentController.getMySessionHistory);

router.put(
  "/my-schedules/hide-bulk",
  auth,
  studentController.hideStudentSchedules
);

// Rute untuk paket & laporan
router.get("/my-packages", auth, studentController.getMyPackages);
router.put(
  "/my-packages/hide-bulk",
  auth,
  studentController.hideMyPackageHistory
);

router.get("/my-reports", auth, studentController.getMyReports);

// Rute untuk membeli paket baru
router.post(
  "/purchase-request",
  [auth, upload.single("paymentProof")],
  studentController.createPurchaseRequest
);

// --- RUTE UNTUK FITUR NOTIFIKASI & PENGUMUMAN ---
router.post("/push-subscribe", auth, studentController.subscribeToPush);
router.get("/announcements", auth, studentController.getMyAnnouncements);
router.put(
  "/announcements/:id/read",
  auth,
  studentController.markAnnouncementAsRead
);

module.exports = router;
