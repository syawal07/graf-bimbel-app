const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const mentorAuth = require("../middleware/mentorAuth");
const mentorController = require("../controllers/mentorController");
const upload = require("../middleware/upload");

// Rute Penjadwalan & Paket
router.get(
  "/assigned-packages",
  [auth, mentorAuth],
  mentorController.getAssignedPackages
);
router.post("/schedules", [auth, mentorAuth], mentorController.createSchedule);

// Rute Jadwal & Sesi
router.get(
  "/my-schedules",
  [auth, mentorAuth],
  mentorController.getMySchedules
);
router.put(
  "/my-schedules/hide-bulk",
  [auth, mentorAuth],
  mentorController.hideMentorSchedules
);
router.put(
  "/my-schedules/:schedule_id/link",
  [auth, mentorAuth],
  mentorController.addSessionLink
);
router.put(
  "/my-schedules/:schedule_id",
  [auth, mentorAuth],
  mentorController.updateMySchedule
);
router.put(
  "/my-schedules/:schedule_id/cancel",
  [auth, mentorAuth],
  mentorController.cancelSchedule
);
router.put(
  "/my-schedules/:schedule_id/mark-absent",
  [auth, mentorAuth],
  mentorController.markStudentAsAbsent
);

// Rute Laporan
router.get(
  "/sessions-for-reporting",
  [auth, mentorAuth],
  mentorController.getCompletedSessions
);
router.post(
  "/reports",
  [auth, mentorAuth, upload.single("sessionMaterial")],
  mentorController.createSessionReport
);

// Rute Profil & Jadwal Pekanan
router.get("/profile", [auth, mentorAuth], mentorController.getMyProfile);
router.get(
  "/my-weekly-schedule",
  [auth, mentorAuth],
  mentorController.getMyWeeklySchedule
);
router.put(
  "/profile",
  [
    auth,
    mentorAuth,
    upload.fields([
      { name: "profile_picture", maxCount: 1 },
      { name: "certificate", maxCount: 1 },
    ]),
  ],
  mentorController.updateMyProfile
);

// Rute Notifikasi & Pengumuman
router.post("/push-subscribe", auth, mentorController.subscribeToPush);
router.get("/announcements", auth, mentorController.getMyAnnouncements);
router.put(
  "/announcements/:id/read",
  auth,
  mentorController.markAnnouncementAsRead
);

module.exports = router;
