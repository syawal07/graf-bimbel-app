// backend/controllers/studentController.js
const pool = require("../config/db");

const studentController = {
  // =======================================================
  // FUNGSI UNTUK HALAMAN JADWAL SISWA
  // =======================================================
  async getMySchedules(req, res) {
    try {
      const studentId = req.user.id;
      // PERBAIKAN: Menghapus kondisi "AND s.hidden_by_student = FALSE"
      const query = `
        SELECT 
          s.schedule_id, s.session_datetime, s.zoom_link, u.full_name as mentor_name
        FROM schedules s
        LEFT JOIN users u ON s.mentor_id = u.user_id
        WHERE s.student_id = $1 AND s.status = 'scheduled' AND s.session_datetime >= NOW()
        ORDER BY s.session_datetime ASC;
      `;
      const { rows } = await pool.query(query, [studentId]);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil jadwal siswa:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getMySessionHistory(req, res) {
    try {
      const studentId = req.user.id;
      const { search, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      let baseQuery = `
      FROM schedules s
      LEFT JOIN users u ON s.mentor_id = u.user_id
      LEFT JOIN session_reports sr ON s.schedule_id = sr.schedule_id
    `;

      let whereClause = ` WHERE s.student_id = $1 AND sr.verified_by_admin = TRUE `;

      // PERBAIKAN: Baris ini ditambahkan untuk membuat variabel queryParams
      const queryParams = [studentId];

      if (search) {
        queryParams.push(`%${search}%`);
        whereClause += ` AND (u.full_name ILIKE $${queryParams.length} OR s.mapel ILIKE $${queryParams.length} OR sr.summary ILIKE $${queryParams.length}) `;
      }

      const countQuery = `SELECT COUNT(s.schedule_id) ${baseQuery} ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      const dataQuery = `
      SELECT 
        s.schedule_id, s.session_datetime, s.status, s.mapel, s.zoom_link,
        u.full_name as mentor_name,
        sr.summary, sr.material_url
      ${baseQuery} 
      ${whereClause}
      ORDER BY s.session_datetime DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
    `;

      const dataResult = await pool.query(dataQuery, [
        ...queryParams,
        limit,
        offset,
      ]);

      res.json({
        schedules: dataResult.rows,
        totalPages: totalPages,
        currentPage: parseInt(page, 10),
      });
    } catch (error) {
      console.error("Error mengambil riwayat sesi siswa:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async hideStudentSchedules(req, res) {
    try {
      const { scheduleIds } = req.body;
      const studentId = req.user.id;

      if (
        !scheduleIds ||
        !Array.isArray(scheduleIds) ||
        scheduleIds.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Daftar ID jadwal tidak valid." });
      }

      // Asumsi kolom 'hidden_by_student' sudah ada di tabel 'schedules'
      const query = `
            UPDATE schedules 
            SET hidden_by_student = TRUE 
            WHERE schedule_id = ANY($1::int[]) AND student_id = $2;
        `;
      const result = await pool.query(query, [scheduleIds, studentId]);

      res.json({
        message: `${result.rowCount} jadwal berhasil disembunyikan.`,
      });
    } catch (error) {
      console.error("Error menyembunyikan jadwal siswa:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },
  // =======================================================
  // FUNGSI PAKET & PEMBELIAN
  // =======================================================
  async getMyPackages(req, res) {
    try {
      const studentId = req.user.id;
      // [PERBAIKAN] Tambahkan filter 'is_hidden_by_student = FALSE'
      const query = `
        SELECT 
          up.user_package_id, up.purchase_date, up.activation_date, up.expiry_date,
          up.status, up.total_sessions, up.used_sessions,
          (up.total_sessions - up.used_sessions) AS remaining_sessions,
          p.package_name
        FROM user_packages up
        JOIN packages p ON up.package_id = p.package_id
        WHERE up.student_id = $1 AND up.is_hidden_by_student = FALSE
        ORDER BY up.purchase_date DESC;
      `;
      const { rows } = await pool.query(query, [studentId]);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil riwayat paket siswa:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  // [FUNGSI BARU] Untuk siswa menyembunyikan riwayat paketnya
  async hideMyPackageHistory(req, res) {
    const studentId = req.user.id;
    const { userPackageIds } = req.body;

    if (
      !userPackageIds ||
      !Array.isArray(userPackageIds) ||
      userPackageIds.length === 0
    ) {
      return res.status(400).json({ message: "Daftar ID paket tidak valid." });
    }

    try {
      const query = `
            UPDATE user_packages
            SET is_hidden_by_student = TRUE
            WHERE user_package_id = ANY($1::int[]) AND student_id = $2;
        `;
      const result = await pool.query(query, [userPackageIds, studentId]);
      res.json({
        message: `${result.rowCount} riwayat paket berhasil disembunyikan.`,
      });
    } catch (error) {
      console.error("Error menyembunyikan riwayat paket:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async createPurchaseRequest(req, res) {
    const { package_id } = req.body;
    const studentId = req.user.id;

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Bukti pembayaran wajib diunggah." });
    }
    const payment_proof_url = req.file.path.replace(/\\/g, "/");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existingPackageQuery = await client.query(
        "SELECT * FROM user_packages WHERE student_id = $1 AND package_id = $2 AND status IN ('active', 'pending')",
        [studentId, package_id]
      );
      if (existingPackageQuery.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: "Anda sudah memiliki permintaan aktif atau paket ini.",
        });
      }

      const packagePriceResult = await client.query(
        "SELECT price, total_sessions FROM packages WHERE package_id = $1",
        [package_id]
      );
      if (packagePriceResult.rows.length === 0) {
        throw new Error("Paket tidak valid atau tidak ditemukan.");
      }
      const { price, total_sessions } = packagePriceResult.rows[0];

      // PERBAIKAN: Query INSERT disesuaikan agar cocok dengan kolom di init.sql.
      const packageQuery = `
        INSERT INTO user_packages (student_id, package_id, total_sessions, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING user_package_id;
      `;
      const packageResult = await client.query(packageQuery, [
        studentId,
        package_id,
        total_sessions,
      ]);
      const { user_package_id } = packageResult.rows[0];

      const paymentQuery = `
        INSERT INTO payments (user_package_id, student_id, amount, payment_date, status, payment_proof_url)
        VALUES ($1, $2, $3, NOW(), 'pending', $4);
      `;
      await client.query(paymentQuery, [
        user_package_id,
        studentId,
        price,
        payment_proof_url,
      ]);

      await client.query("COMMIT");
      res.status(201).json({
        message:
          "Konfirmasi pembayaran berhasil dikirim dan sedang menunggu verifikasi.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error membuat permintaan pembelian:", error);
      res
        .status(500)
        .json({ message: error.message || "Terjadi kesalahan pada server" });
    } finally {
      client.release();
    }
  },

  // =======================================================
  // FUNGSI PENGUMUMAN & NOTIFIKASI
  // =======================================================
  async subscribeToPush(req, res) {
    const subscription = req.body.subscription;
    const userId = req.user.id;
    try {
      await pool.query(
        "INSERT INTO push_subscriptions (user_id, subscription_data) VALUES ($1, $2) ON CONFLICT (subscription_data) DO NOTHING",
        [userId, subscription]
      );
      res.status(201).json({ message: "Berhasil subscribe notifikasi." });
    } catch (error) {
      console.error("Error saat menyimpan subscription siswa:", error);
      res.status(500).json({ message: "Gagal subscribe notifikasi." });
    }
  },

  async getMyAnnouncements(req, res) {
    const userId = req.user.id;
    try {
      const { rows } = await pool.query(
        `
        SELECT 
          a.announcement_id, 
          a.title, 
          a.message, 
          a.created_at, 
          uas.is_read
        FROM announcements a
        LEFT JOIN user_announcement_status uas ON a.announcement_id = uas.announcement_id AND uas.user_id = $1
        WHERE 
          a.target_role = (SELECT role FROM users WHERE user_id = $1)
          OR a.target_role = 'all'
        ORDER BY a.created_at DESC
      `,
        [userId]
      );
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil pengumuman siswa:", error);
      res.status(500).json({ message: "Gagal mengambil pengumuman." });
    }
  },

  async markAnnouncementAsRead(req, res) {
    const userId = req.user.id;
    const { id: announcementId } = req.params;
    try {
      await pool.query(
        "UPDATE user_announcement_status SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND announcement_id = $2",
        [userId, announcementId]
      );
      res.json({ message: "Pengumuman ditandai sudah dibaca." });
    } catch (error) {
      console.error("Error saat update status baca pengumuman siswa:", error);
      res.status(500).json({ message: "Gagal update status pengumuman." });
    }
  },

  async getMyReports(req, res) {
    try {
      const studentId = req.user.id;
      const query = `
            SELECT 
                s.session_datetime,
                u.full_name as mentor_name,
                sr.summary, 
                s.status,
                sr.student_development_journal,
                sr.material_url
            FROM session_reports sr
            JOIN schedules s ON sr.schedule_id = s.schedule_id
            LEFT JOIN users u ON s.mentor_id = u.user_id
            WHERE s.student_id = $1 AND sr.verified_by_admin = true
            ORDER BY s.session_datetime DESC;
        `;
      const { rows } = await pool.query(query, [studentId]);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil riwayat laporan siswa:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },
};

module.exports = studentController;
