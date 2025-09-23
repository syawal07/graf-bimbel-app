// backend/controllers/mentorController.js
const pool = require("../config/db");
const mentorController = {
  // =================================================================
  // == FUNGSI UNTUK ALUR PENJADWALAN BARU ==
  // =================================================================

  async getAssignedPackages(req, res) {
    try {
      const mentorId = req.user.id;
      // PERBAIKAN: Mentor ditugaskan melalui tabel 'user_package_mentors', bukan 'user_packages'.
      const query = `
        SELECT 
          up.user_package_id,
          up.schedule_recommendation,
          u.user_id AS student_id,
          u.full_name AS student_name,
          u.nickname, u.city, u.school, u.notes,
          p.package_name,
          (up.total_sessions - up.used_sessions) AS remaining_sessions
        FROM user_package_mentors upm
        JOIN user_packages up ON upm.user_package_id = up.user_package_id
        JOIN users u ON up.student_id = u.user_id
        JOIN packages p ON up.package_id = p.package_id
        WHERE upm.mentor_id = $1 AND up.status = 'active';
      `;
      const { rows } = await pool.query(query, [mentorId]);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil paket yang ditugaskan:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async createSchedule(req, res) {
    const mentorId = req.user.id;
    const { student_id, user_package_id, session_datetime, zoom_link, mapel } =
      req.body;

    if (!student_id || !user_package_id || !session_datetime) {
      return res
        .status(400)
        .json({ message: "Siswa, paket, dan waktu sesi wajib diisi." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const packageQuery = `
      SELECT up.used_sessions, up.total_sessions, upm.session_rate 
      FROM user_packages up
      JOIN user_package_mentors upm ON up.user_package_id = upm.user_package_id
      WHERE up.user_package_id = $1 AND upm.mentor_id = $2 FOR UPDATE;
    `;
      const packageCheck = await client.query(packageQuery, [
        user_package_id,
        mentorId,
      ]);

      if (packageCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          message:
            "Anda tidak ditugaskan untuk paket ini atau paket tidak valid.",
        });
      }

      const { used_sessions, total_sessions, session_rate } =
        packageCheck.rows[0];

      if (used_sessions >= total_sessions) {
        await client.query("ROLLBACK");
        return res
          .status(403)
          .json({ message: "Sesi siswa untuk paket ini sudah habis." });
      }

      const createScheduleQuery = `
      INSERT INTO schedules (student_id, mentor_id, user_package_id, session_datetime, zoom_link, mapel, session_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
      const { rows } = await client.query(createScheduleQuery, [
        student_id,
        mentorId,
        user_package_id,
        session_datetime,
        zoom_link,
        mapel,
        session_rate,
      ]);

      await client.query("COMMIT");

      res.status(201).json({
        message: "Jadwal berhasil dibuat.", // Pesan diubah karena tidak lagi update sesi
        schedule: rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saat mentor membuat jadwal:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    } finally {
      client.release();
    }
  },

  // =================================================================
  // == FUNGSI MANAJEMEN JADWAL & SESI ==
  // =================================================================

  async getMySchedules(req, res) {
    try {
      const mentorId = req.user.id;
      const { search, page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      let baseQuery = `
        FROM schedules s
        LEFT JOIN users u ON s.student_id = u.user_id
        LEFT JOIN user_packages up ON s.user_package_id = up.user_package_id
        LEFT JOIN user_package_mentors upm ON up.user_package_id = upm.user_package_id AND s.mentor_id = upm.mentor_id
        LEFT JOIN session_reports sr ON s.schedule_id = sr.schedule_id
      `;

      // [DIPERBAIKI] Menambahkan filter AND s.status != 'student_absent'
      let whereClause = ` WHERE s.mentor_id = $1 AND (s.hidden_by_mentor IS NULL OR s.hidden_by_mentor = FALSE) AND s.status != 'student_absent' `;
      const queryParams = [mentorId];

      if (search) {
        queryParams.push(`%${search}%`);
        whereClause += ` AND (u.full_name ILIKE $${queryParams.length} OR s.mapel ILIKE $${queryParams.length}) `;
      }

      const countQuery = `SELECT COUNT(s.schedule_id) ${baseQuery} ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      const dataQuery = `
        SELECT 
          s.schedule_id, s.session_datetime, s.status, s.mapel,
          u.full_name as student_name,
          COALESCE(upm.session_rate, s.session_rate) AS session_rate,
          COALESCE(sr.payroll_status, 'Belum Lapor') AS payroll_status,
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
      console.error("Error mengambil jadwal mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  // ... (Fungsi addSessionLink, updateMySchedule, cancelSchedule tidak perlu diubah, kodenya sudah benar)
  async addSessionLink(req, res) {
    // Kode ini sudah benar
    try {
      const mentorId = req.user.id;
      const { schedule_id } = req.params;
      const { zoom_link } = req.body;
      if (!zoom_link) {
        return res
          .status(400)
          .json({ message: "Link sesi tidak boleh kosong." });
      }
      const query = `
        UPDATE schedules
        SET zoom_link = $1
        WHERE schedule_id = $2 AND mentor_id = $3
        RETURNING *;
      `;
      const result = await pool.query(query, [
        zoom_link,
        schedule_id,
        mentorId,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Jadwal tidak ditemukan atau Anda tidak berhak mengubahnya.",
        });
      }
      res.json({
        message: "Link sesi berhasil ditambahkan.",
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error("Error menambahkan link sesi:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async updateMySchedule(req, res) {
    // Kode ini sudah benar
    try {
      const { schedule_id } = req.params;
      const { session_datetime } = req.body;
      const mentorId = req.user.id;
      if (!session_datetime) {
        return res
          .status(400)
          .json({ message: "Waktu sesi baru wajib diisi." });
      }
      const query = `
        UPDATE schedules
        SET session_datetime = $1
        WHERE schedule_id = $2 AND mentor_id = $3
        RETURNING *;
      `;
      const result = await pool.query(query, [
        session_datetime,
        schedule_id,
        mentorId,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Jadwal tidak ditemukan atau Anda tidak berhak mengubahnya.",
        });
      }
      res.json({
        message: "Jadwal berhasil diperbarui.",
        schedule: result.rows[0],
      });
    } catch (error) {
      console.error("Error saat mentor update jadwal:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async cancelSchedule(req, res) {
    // Kode ini sudah benar
    try {
      const { schedule_id } = req.params;
      const mentorId = req.user.id;
      const query = `
        UPDATE schedules
        SET status = 'cancelled'
        WHERE schedule_id = $1 AND mentor_id = $2
        RETURNING *;
      `;
      const result = await pool.query(query, [schedule_id, mentorId]);
      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Jadwal tidak ditemukan atau Anda tidak berhak membatalkannya.",
        });
      }
      res.json({ message: "Jadwal berhasil dibatalkan." });
    } catch (error) {
      console.error("Error saat mentor membatalkan jadwal:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async hideMentorSchedules(req, res) {
    // CATATAN: Fungsi ini akan GAGAL sampai Anda menjalankan perintah ALTER TABLE
    try {
      const { scheduleIds } = req.body;
      const mentorId = req.user.id;

      if (
        !scheduleIds ||
        !Array.isArray(scheduleIds) ||
        scheduleIds.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Daftar ID jadwal tidak valid." });
      }

      const query = `
      UPDATE schedules 
      SET hidden_by_mentor = TRUE 
      WHERE schedule_id = ANY($1::int[]) AND mentor_id = $2;
    `;

      const result = await pool.query(query, [scheduleIds, mentorId]);

      res.json({
        message: `${result.rowCount} jadwal berhasil disembunyikan.`,
      });
    } catch (error) {
      console.error("Error menyembunyikan jadwal mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async markStudentAsAbsent(req, res) {
    const { schedule_id } = req.params;
    const mentorId = req.user.id;

    try {
      const query = `
      UPDATE schedules
      SET status = 'student_absent' 
      WHERE schedule_id = $1 AND mentor_id = $2 AND status = 'scheduled'
      RETURNING schedule_id;
    `;
      const result = await pool.query(query, [schedule_id, mentorId]);

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ message: "Jadwal tidak ditemukan atau sudah dilaporkan." });
      }

      res.status(200).json({
        message:
          "Sesi telah ditandai sebagai siswa tidak hadir dan dihapus dari daftar laporan.",
      });
    } catch (error) {
      console.error("Error saat menandai siswa tidak hadir:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  // =================================================================
  // == FUNGSI UNTUK PELAPORAN SESI ==
  // =================================================================

  async getCompletedSessions(req, res) {
    // Kode ini sudah benar
    try {
      const mentorId = req.user.id;
      const query = `
        SELECT 
          s.schedule_id,
          s.session_datetime,
          u.full_name AS student_name
        FROM 
          schedules s
        JOIN 
          users u ON s.student_id = u.user_id
        LEFT JOIN 
          session_reports sr ON s.schedule_id = sr.schedule_id
        WHERE 
          s.mentor_id = $1
          AND s.session_datetime < NOW()
          AND s.status = 'scheduled'
          AND sr.report_id IS NULL
        ORDER BY 
          s.session_datetime DESC;
      `;
      const { rows } = await pool.query(query, [mentorId]);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil sesi selesai:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async createSessionReport(req, res) {
    try {
      const mentorId = req.user.id;
      const {
        schedule_id,
        summary,
        student_development_journal,
        student_attended,
      } = req.body;

      const material_url = req.file ? req.file.path.replace(/\\/g, "/") : null;

      if (!schedule_id || !summary) {
        return res
          .status(400)
          .json({ message: "Jadwal sesi dan rangkuman wajib diisi." });
      }

      const existingReport = await pool.query(
        "SELECT report_id FROM session_reports WHERE schedule_id = $1",
        [schedule_id]
      );

      if (existingReport.rows.length > 0) {
        return res.status(409).json({
          message: "Laporan untuk sesi ini sudah pernah dibuat sebelumnya.",
        });
      }

      // PERBAIKAN: Hapus pengambilan student_id karena tidak diperlukan untuk INSERT
      const scheduleCheck = await pool.query(
        "SELECT 1 FROM schedules WHERE schedule_id = $1 AND mentor_id = $2",
        [schedule_id, mentorId]
      );
      if (scheduleCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Jadwal tidak ditemukan atau bukan milik Anda." });
      }

      // PERBAIKAN: Hapus kolom 'student_id' dari INSERT karena tidak ada di tabel 'session_reports'
      const query = `
      INSERT INTO session_reports (schedule_id, mentor_id, summary, student_development_journal, student_attended, material_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
      const newReport = await pool.query(query, [
        schedule_id,
        mentorId,
        summary,
        student_development_journal,
        student_attended,
        material_url,
      ]);

      res.status(201).json({
        message: "Laporan sesi berhasil dibuat.",
        report: newReport.rows[0],
      });
    } catch (error) {
      console.error("Error membuat laporan sesi:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  // =================================================================
  // == FUNGSI PROFIL & PENGUMUMAN (SUDAH BENAR) ==
  // =================================================================

  // ... (Fungsi getMyProfile, updateMyProfile, getMyWeeklySchedule tidak perlu diubah, kodenya sudah benar dari perbaikan sebelumnya)
  async getMyProfile(req, res) {
    try {
      const mentorId = req.user.id;

      // 1. Promise untuk mengambil data profil mentor (query Anda tidak berubah)
      const mentorInfoPromise = pool.query(
        `SELECT 
        u.user_id, u.full_name, u.email, u.phone_number, u.nickname,
        mp.* FROM users u
      LEFT JOIN mentor_profiles mp ON u.user_id = mp.mentor_id
      WHERE u.user_id = $1;`,
        [mentorId]
      );

      // 2. Promise baru untuk mengambil riwayat mengajar mentor
      const scheduleHistoryPromise = pool.query(
        `SELECT 
        s.schedule_id, 
        s.session_datetime, 
        s.mapel,
        u.full_name AS student_name,
        sr.payroll_status
      FROM schedules s
      LEFT JOIN users u ON s.student_id = u.user_id
      LEFT JOIN session_reports sr ON s.schedule_id = sr.schedule_id
      WHERE s.mentor_id = $1 
        AND (s.hidden_by_mentor IS NULL OR s.hidden_by_mentor = FALSE) -- Filter penting!
      ORDER BY s.session_datetime DESC;`,
        [mentorId]
      );

      // 3. Menjalankan kedua query secara bersamaan untuk efisiensi
      const [mentorInfoRes, scheduleHistoryRes] = await Promise.all([
        mentorInfoPromise,
        scheduleHistoryPromise,
      ]);

      if (mentorInfoRes.rows.length === 0) {
        return res.status(404).json({ message: "Profil tidak ditemukan." });
      }

      // 4. Menggabungkan hasil ke dalam satu objek respons
      const responseData = {
        mentor: mentorInfoRes.rows[0],
        scheduleHistory: scheduleHistoryRes.rows,
      };

      res.json(responseData);
    } catch (error) {
      console.error("Error mengambil profil mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async updateMyProfile(req, res) {
    // Kode ini sudah benar
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const mentorId = req.user.id;

      const {
        full_name,
        phone_number,
        nickname,
        date_of_birth,
        gender,
        domicile,
        last_education,
        major,
        expert_subjects,
        teachable_levels,
        teaching_experience,
        availability,
        max_teaching_hours,
        teaching_mode,
        bank_account_number,
        bank_name,
        id_card_number,
      } = req.body;

      const currentProfileQuery = await client.query(
        "SELECT profile_picture_url, certificate_url FROM mentor_profiles WHERE mentor_id = $1",
        [mentorId]
      );
      const currentProfile = currentProfileQuery.rows[0] || {};

      const profile_picture_url = req.files?.profile_picture
        ? req.files.profile_picture[0].path.replace(/\\/g, "/")
        : currentProfile.profile_picture_url;
      const certificate_url = req.files?.certificate
        ? req.files.certificate[0].path.replace(/\\/g, "/")
        : currentProfile.certificate_url;

      const maxHours =
        max_teaching_hours === "" || max_teaching_hours === undefined
          ? null
          : parseInt(max_teaching_hours);

      await client.query(
        `UPDATE users SET full_name = $1, phone_number = $2, nickname = $3 WHERE user_id = $4;`,
        [full_name, phone_number, nickname, mentorId]
      );

      const subjectsArray = expert_subjects
        ? expert_subjects.split(",").map((s) => s.trim())
        : null;
      const levelsArray = teachable_levels
        ? teachable_levels.split(",").map((l) => l.trim())
        : null;

      const profileQuery = `
        INSERT INTO mentor_profiles (
            mentor_id, date_of_birth, gender, domicile, last_education, 
            major, expert_subjects, teachable_levels, teaching_experience, 
            availability, max_teaching_hours, teaching_mode, bank_account_number, 
            bank_name, id_card_number, profile_picture_url, certificate_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (mentor_id) 
        DO UPDATE SET
            date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, 
            domicile = EXCLUDED.domicile, last_education = EXCLUDED.last_education, 
            major = EXCLUDED.major, expert_subjects = EXCLUDED.expert_subjects, 
            teachable_levels = EXCLUDED.teachable_levels, teaching_experience = EXCLUDED.teaching_experience, 
            availability = EXCLUDED.availability, max_teaching_hours = EXCLUDED.max_teaching_hours, 
            teaching_mode = EXCLUDED.teaching_mode, bank_account_number = EXCLUDED.bank_account_number, 
            bank_name = EXCLUDED.bank_name, id_card_number = EXCLUDED.id_card_number, 
            profile_picture_url = EXCLUDED.profile_picture_url, certificate_url = EXCLUDED.certificate_url;
      `;

      await client.query(profileQuery, [
        mentorId,
        date_of_birth || null,
        gender,
        domicile,
        last_education,
        major,
        subjectsArray,
        levelsArray,
        teaching_experience,
        availability,
        maxHours,
        teaching_mode,
        bank_account_number,
        bank_name,
        id_card_number,
        profile_picture_url,
        certificate_url,
      ]);

      await client.query("COMMIT");

      const updatedProfileQuery = await client.query(
        `SELECT u.user_id, u.full_name, u.email, u.phone_number, u.nickname, mp.* FROM users u
       LEFT JOIN mentor_profiles mp ON u.user_id = mp.mentor_id
       WHERE u.user_id = $1;`,
        [mentorId]
      );

      res.json({
        message: "Profil berhasil diperbarui.",
        profile: updatedProfileQuery.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error memperbarui profil mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    } finally {
      client.release();
    }
  },

  async getMyWeeklySchedule(req, res) {
    // Kode ini sudah benar
    try {
      const mentorId = req.user.id;
      const query = `
        SELECT weekly_schedule_id, day_of_week, start_time, end_time, description
        FROM mentor_weekly_schedules
        WHERE mentor_id = $1
        ORDER BY day_of_week, start_time;
      `;
      const { rows } = await pool.query(query, [mentorId]);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil jadwal pekanan mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async subscribeToPush(req, res) {
    // Kode ini sudah benar
    const subscription = req.body.subscription;
    const userId = req.user.id;
    try {
      await pool.query(
        "INSERT INTO push_subscriptions (user_id, subscription_data) VALUES ($1, $2) ON CONFLICT (subscription_data) DO NOTHING",
        [userId, subscription]
      );
      res.status(201).json({ message: "Berhasil subscribe notifikasi." });
    } catch (error) {
      console.error("Error saat menyimpan subscription mentor:", error);
      res.status(500).json({ message: "Gagal subscribe notifikasi." });
    }
  },

  async getMyAnnouncements(req, res) {
    const userId = req.user.id;
    try {
      // PERBAIKAN: Logika JOIN dan WHERE disesuaikan agar menampilkan semua pengumuman yang relevan
      const { rows } = await pool.query(
        `
        SELECT 
          a.announcement_id, a.title, a.message, a.created_at, uas.is_read
        FROM announcements a
        LEFT JOIN user_announcement_status uas ON a.announcement_id = uas.announcement_id AND uas.user_id = $1
        WHERE a.target_role = 'mentor' OR a.target_role = 'all'
        ORDER BY a.created_at DESC
        `,
        [userId]
      );
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil pengumuman mentor:", error);
      res.status(500).json({ message: "Gagal mengambil pengumuman." });
    }
  },

  async markAnnouncementAsRead(req, res) {
    const userId = req.user.id;
    const { id: announcementId } = req.params;
    try {
      // PERBAIKAN: Menggunakan INSERT ON CONFLICT agar lebih aman (robust)
      await pool.query(
        `INSERT INTO user_announcement_status (user_id, announcement_id, is_read, read_at)
         VALUES ($1, $2, TRUE, NOW())
         ON CONFLICT (user_id, announcement_id) 
         DO UPDATE SET is_read = TRUE, read_at = NOW()`,
        [userId, announcementId]
      );
      res.json({ message: "Pengumuman ditandai sudah dibaca." });
    } catch (error) {
      console.error("Error saat update status baca pengumuman mentor:", error);
      res.status(500).json({ message: "Gagal update status pengumuman." });
    }
  },
};

module.exports = mentorController;
