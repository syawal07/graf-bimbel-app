const webPush = require("web-push");

// Konfigurasi web-push dengan kunci VAPID dari .env
webPush.setVapidDetails(
  "mailto:syawalaj0712@gmail.com", // Ganti dengan email admin Anda
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const triggerPushNotification = async (subscription, payload) => {
  try {
    await webPush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) {
    console.error("Gagal mengirim notifikasi push:", error.statusCode);
    // Di sini bisa ditambahkan logika untuk menghapus subscription yang sudah tidak valid (error 410)
  }
};

module.exports = { triggerPushNotification };
