const express = require("express");
const router = express.Router();

// Middleware
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const upload = require("../middleware/upload");

// Controllers
const adminController = require("../controllers/adminController");
const contentController = require("../controllers/contentController");

// Gabungan middleware untuk rute admin
const adminMiddleware = [auth, adminAuth];

// =================================================================
// RUTE DASHBOARD
// =================================================================
router.get(
  "/dashboard-summary",
  adminMiddleware,
  adminController.getDashboardSummary
);

// =================================================================
// RUTE MANAJEMEN PENGGUNA (USERS & MENTORS)
// =================================================================
router.get("/users", adminMiddleware, adminController.getAllUsers);
router.post("/users", adminMiddleware, adminController.createUser);
router.get("/users/:id", adminMiddleware, adminController.getUserById);
router.put("/users/:id", adminMiddleware, adminController.updateUser);
router.delete("/users/:id", adminMiddleware, adminController.deleteUser);
router.get(
  "/users/student-profile/:id",
  adminMiddleware,
  adminController.getStudentProfile
);
router.get("/mentors", adminMiddleware, adminController.getAllMentors);
router.get(
  "/mentors/:id/profile",
  adminMiddleware,
  adminController.getMentorProfile
);
router.get(
  "/mentors/:mentorId/weekly-schedule",
  adminMiddleware,
  adminController.getMentorWeeklySchedule
);
router.put(
  "/mentors/:mentorId/weekly-schedule",
  adminMiddleware,
  adminController.setMentorWeeklySchedule
);

// =================================================================
// RUTE MANAJEMEN PAKET BIMBEL
// =================================================================
router.get("/packages", adminMiddleware, adminController.getAllPackages);
router.post("/packages", adminMiddleware, adminController.createPackage);
router.get("/packages/:id", adminMiddleware, adminController.getPackageById);
router.put("/packages/:id", adminMiddleware, adminController.updatePackage);
router.delete("/packages/:id", adminMiddleware, adminController.deletePackage);
router.post(
  "/user-packages/:user_package_id/mentors",
  adminMiddleware,
  adminController.assignMentorToPackage
);
router.delete(
  "/user-packages/:user_package_id/mentors/:mentor_id",
  adminMiddleware,
  adminController.removeMentorFromPackage
);
router.put(
  "/user-packages/bulk-hide",
  adminMiddleware,
  adminController.hideUserPackagesBulk
);

// =================================================================
// RUTE MANAJEMEN JADWAL (SCHEDULES)
// =================================================================
router.get("/schedules", adminMiddleware, adminController.getGlobalSchedule);
router.put(
  "/schedules/bulk-hide",
  adminMiddleware,
  adminController.hideAdminSchedules
);
router.put(
  "/schedules/hide-history",
  adminMiddleware,
  adminController.hideTeachingHistoryBulk
);

// =================================================================
// RUTE MANAJEMEN PEMBAYARAN & LAPORAN
// =================================================================
router.get(
  "/payments/pending",
  adminMiddleware,
  adminController.getPendingPayments
);
router.get(
  "/payments/verified",
  adminMiddleware,
  adminController.getVerifiedPayments
);
router.get(
  "/payments/pending/:payment_id",
  adminMiddleware,
  adminController.getPaymentDetailsForVerification
);
router.put(
  "/payments/:payment_id/verify",
  adminMiddleware,
  adminController.verifyPayment
);
router.put(
  "/payments/hide-bulk",
  adminMiddleware,
  adminController.hideVerifiedPayments
);
router.get("/reports", adminMiddleware, adminController.getReports);
router.put(
  "/reports/:report_id/verify",
  adminMiddleware,
  adminController.verifySessionReport
);
router.put("/reports/hide-bulk", adminMiddleware, adminController.hideReports);
router.get(
  "/reports/verified-count",
  adminMiddleware,
  adminController.getVerifiedCountSinceReset 
);
router.post(
  "/reports/reset-count",
  adminMiddleware,
  adminController.resetVerifiedCount
);

// =================================================================
// RUTE MANAJEMEN GAJI (PAYROLL)
// =================================================================
router.get(
  "/payroll-report",
  adminMiddleware,
  adminController.getPayrollReport
);
router.put(
  "/payroll-history/hide-bulk",
  adminMiddleware,
  adminController.hidePayrollHistory
);
router.get(
  "/payroll-report/:mentorId/details",
  adminMiddleware,
  adminController.getPayrollReportDetails
);
router.put(
  "/payroll-report/mark-paid",
  adminMiddleware,
  adminController.markMonthlyPayrollAsPaid
);
router.get(
  "/payroll-history/:batch_id/details",
  adminMiddleware,
  adminController.getPayrollHistoryDetails
);
router.put(
  "/payroll-report/hide-bulk",
  adminMiddleware,
  adminController.hideMonthlyPayrolls
);
router.get("/payroll-daily", adminMiddleware, adminController.getDailyPayroll);
router.get(
  "/payroll-daily/:mentorId/details",
  adminMiddleware,
  adminController.getDailyPayrollDetails
);
router.put(
  "/payroll-daily/mark-paid",
  adminMiddleware,
  adminController.markDailyMentorPayrollAsPaid
);

// =================================================================
// RUTE MANAJEMEN KONTEN WEBSITE
// =================================================================
router.post("/advantages", adminMiddleware, contentController.createAdvantage);
router.put(
  "/advantages/:id",
  adminMiddleware,
  contentController.updateAdvantage
);
router.delete(
  "/advantages/:id",
  adminMiddleware,
  contentController.deleteAdvantage
);
router.post("/faqs", adminMiddleware, contentController.createFaq);
router.put("/faqs/:id", adminMiddleware, contentController.updateFaq);
router.delete("/faqs/:id", adminMiddleware, contentController.deleteFaq);
router.post(
  "/announcements",
  adminMiddleware,
  adminController.createAnnouncement
);
router.get("/hero-slides", adminMiddleware, contentController.getAllHeroSlides);
router.post(
  "/hero-slides",
  [...adminMiddleware, upload.single("mediaFile")],
  contentController.createHeroSlide
);
router.put(
  "/hero-slides/:id",
  [...adminMiddleware, upload.single("mediaFile")],
  contentController.updateHeroSlide
);
router.delete(
  "/hero-slides/:id",
  adminMiddleware,
  contentController.deleteHeroSlide
);
router.get(
  "/payment-methods",
  adminMiddleware,
  contentController.getAllPaymentMethods
);
router.post(
  "/payment-methods",
  [...adminMiddleware, upload.single("logoFile")],
  contentController.createPaymentMethod
);
router.put(
  "/payment-methods/:id",
  [...adminMiddleware, upload.single("logoFile")],
  contentController.updatePaymentMethod
);
router.delete(
  "/payment-methods/:id",
  adminMiddleware,
  contentController.deletePaymentMethod
);

// =================================================================
// RUTE PENGATURAN SITUS
// =================================================================
router.put(
  "/settings/logo",
  [...adminMiddleware, upload.single("logoFile")],
  contentController.updateLogo
);
router.put("/settings", adminMiddleware, contentController.updateSiteSettings);

module.exports = router;
