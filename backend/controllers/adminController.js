//backend/controllers/adminController.js;
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const { format } = require("date-fns");
const { triggerPushNotification } = require("../services/webPushService");
// Fungsi helper untuk cek paket kedaluwarsa
async function checkAndUpdateExpiredPackages() {
  try {
    const expiryQuery = `
      UPDATE user_packages
      SET status = 'expired'
      WHERE status = 'active' AND expiry_date < NOW();
    `;
    await pool.query(expiryQuery);
    const sessionQuery = `
      UPDATE user_packages
      SET status = 'finished'
      WHERE status = 'active' AND used_sessions >= total_sessions;
    `;
    await pool.query(sessionQuery);
  } catch (error) {
    console.error("Error saat update paket kedaluwarsa atau selesai:", error);
  }
}

// [FUNGSI HELPER DI SINI]
async function createNotification(client, { userId, title, message, role }) {
  const announcementRes = await client.query(
    `INSERT INTO announcements (title, message, target_role) 
     VALUES ($1, $2, $3) RETURNING announcement_id`,
    [title, message, role]
  );
  const { announcement_id } = announcementRes.rows[0];

  await client.query(
    `INSERT INTO user_announcement_status (user_id, announcement_id) 
     VALUES ($1, $2)`,
    [userId, announcement_id]
  );
}
const adminController = {
  // ==================================================
  // FUNGSI DASHBOARD
  // ==================================================
  async getDashboardSummary(req, res) {
    try {
      const studentQuery = "SELECT COUNT(*) FROM users WHERE role = 'siswa'";
      const mentorQuery = "SELECT COUNT(*) FROM users WHERE role = 'mentor'";
      const pendingPaymentQuery =
        "SELECT COUNT(*) FROM payments WHERE status = 'pending'";
      const todaySessionQuery = `
        SELECT COUNT(*) FROM schedules
        WHERE session_datetime >= date_trunc('day', NOW())
          AND session_datetime < date_trunc('day', NOW()) + interval '1 day'
      `;
      const [studentRes, mentorRes, paymentRes, sessionRes] = await Promise.all(
        [
          pool.query(studentQuery),
          pool.query(mentorQuery),
          pool.query(pendingPaymentQuery),
          pool.query(todaySessionQuery),
        ]
      );
      const summary = {
        activeStudents: parseInt(studentRes.rows[0].count, 10),
        activeMentors: parseInt(mentorRes.rows[0].count, 10),
        pendingPayments: parseInt(paymentRes.rows[0].count, 10),
        upcomingSessions: parseInt(sessionRes.rows[0].count, 10),
      };
      res.json(summary);
    } catch (error) {
      console.error("Error mengambil data ringkasan dashboard:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  // ==================================================
  // FUNGSI MANAJEMEN PENGGUNA (USERS)
  // ==================================================
  async getAllUsers(req, res) {
    await checkAndUpdateExpiredPackages();
    const { page = 1, limit = 10, role, search, status } = req.query;
    const offset = (page - 1) * limit;

    try {
      let whereClauses = ["u.role != 'admin'"];
      const queryParams = [];

      if (role) {
        queryParams.push(role);
        whereClauses.push(`u.role = $${queryParams.length}`);
      }
      if (search) {
        queryParams.push(`%${search}%`);
        whereClauses.push(`u.full_name ILIKE $${queryParams.length}`);
      }

      // Subquery untuk ringkasan paket siswa
      const packageSummarySubquery = `
      LEFT JOIN (
          SELECT 
              student_id, 
              COUNT(*) AS total_packages,
              COUNT(*) FILTER (WHERE status = 'active') AS active_packages
          FROM user_packages 
          WHERE is_hidden_by_admin = FALSE
          GROUP BY student_id
      ) AS package_summary ON u.user_id = package_summary.student_id
    `;

      if (role === "siswa") {
        if (status === "active") {
          whereClauses.push(
            `(package_summary.active_packages > 0 OR package_summary.total_packages IS NULL)`
          );
        } else if (status === "inactive") {
          whereClauses.push(
            `(package_summary.active_packages = 0 AND package_summary.total_packages > 0)`
          );
        }
      }

      const baseQuery = `
      FROM users u
      LEFT JOIN mentor_profiles mp ON u.user_id = mp.mentor_id
      ${packageSummarySubquery}
      LEFT JOIN (
          SELECT DISTINCT ON (student_id) * FROM user_packages
          WHERE is_hidden_by_admin = FALSE
          ORDER BY student_id, purchase_date DESC
      ) AS latest_package ON u.user_id = latest_package.student_id
      WHERE ${whereClauses.join(" AND ")}
    `;

      // PERBAIKAN: Menambahkan nickname, expert_subjects, dan teachable_levels
      const dataQuery = `
      SELECT
          u.user_id, u.full_name, u.email, u.role, u.phone_number, u.city, u.school,
          u.nickname, -- <-- Nama Panggilan
          mp.expert_subjects, -- <-- Mapel Keahlian
          mp.teachable_levels, -- <-- Jenjang Ajar
          latest_package.status AS package_status,
          latest_package.total_sessions,
          latest_package.used_sessions,
          latest_package.expiry_date,
          package_summary.total_packages,
          package_summary.active_packages
      ${baseQuery}
      ORDER BY u.user_id DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
    `;

      // Subquery untuk count harus konsisten
      const countQuery = `SELECT COUNT(*) FROM (SELECT u.user_id ${baseQuery}) AS total_count;`;

      // Jalankan query secara paralel untuk efisiensi
      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, [...queryParams, limit, offset]),
        pool.query(countQuery, queryParams),
      ]);

      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        users: dataResult.rows,
        totalPages,
        currentPage: parseInt(page, 10),
      });
    } catch (error) {
      console.error("Error mengambil data semua user:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },
  async createUser(req, res) {
    try {
      const { full_name, email, password, role, phone_number, ...otherData } =
        req.body;
      if (!full_name || !email || !password || !role) {
        return res
          .status(400)
          .json({ message: "Nama, email, password, dan peran wajib diisi." });
      }

      const emailExists = await pool.query(
        "SELECT 1 FROM users WHERE email = $1",
        [email]
      );
      if (emailExists.rows.length > 0) {
        return res.status(409).json({ message: "Email sudah terdaftar." });
      }

      if (phone_number) {
        const phoneExists = await pool.query(
          "SELECT 1 FROM users WHERE phone_number = $1",
          [phone_number]
        );
        if (phoneExists.rows.length > 0) {
          return res.status(409).json({
            message: "Nomor telepon sudah digunakan oleh pengguna lain.",
          });
        }
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Tidak ada perubahan di sini, sudah benar.
      const query = `
        INSERT INTO users (full_name, email, password_hash, role, phone_number, payment_type, nickname, city, school, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING user_id, full_name, email, role;
      `;
      const newUser = await pool.query(query, [
        full_name,
        email,
        password_hash,
        role,
        phone_number,
        otherData.payment_type || (role === "mentor" ? "monthly" : null),
        otherData.nickname,
        otherData.city,
        otherData.school,
        otherData.notes,
      ]);

      res
        .status(201)
        .json({ message: "Pengguna berhasil dibuat.", user: newUser.rows[0] });
    } catch (error) {
      console.error("Error membuat user baru:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const query =
        "SELECT user_id, full_name, email, role, phone_number, nickname, city, school, notes FROM users WHERE user_id = $1";
      const { rows } = await pool.query(query, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan." });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error("Error mengambil data user by id:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getStudentDetails(req, res) {
    try {
      const { id } = req.params;
      const query =
        "SELECT user_id, full_name, email, phone_number, nickname, city, school, notes FROM users WHERE user_id = $1";
      const { rows } = await pool.query(query, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Siswa tidak ditemukan." });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error("Error mengambil detail siswa:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const {
        full_name,
        email,
        role,
        phone_number,
        payment_type,
        nickname,
        city,
        school,
        notes,
      } = req.body;
      if (!full_name || !email || !role) {
        return res
          .status(400)
          .json({ message: "Nama, email, dan peran wajib diisi." });
      }
      const query = `
        UPDATE users
        SET full_name = $1, email = $2, role = $3, phone_number = $4, payment_type = $5,
            nickname = $6, city = $7, school = $8, notes = $9
        WHERE user_id = $10
        RETURNING user_id, full_name, email, role;
      `;
      const updatedUser = await pool.query(query, [
        full_name,
        email,
        role,
        phone_number,
        payment_type || "monthly",
        nickname,
        city,
        school,
        notes,
        id,
      ]);
      if (updatedUser.rows.length === 0) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan." });
      }
      res.json({
        message: "Data pengguna berhasil diperbarui.",
        user: updatedUser.rows[0],
      });
    } catch (error) {
      console.error("Error update user:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async deleteUser(req, res) {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const userRoleQuery = await client.query(
        "SELECT role FROM users WHERE user_id = $1",
        [id]
      );
      if (userRoleQuery.rows.length === 0) {
        throw new Error("Pengguna tidak ditemukan.");
      }
      const userRole = userRoleQuery.rows[0].role;
      if (userRole === "mentor") {
        await client.query("DELETE FROM mentor_profiles WHERE mentor_id = $1", [
          id,
        ]);
      }
      // Relasi lain akan terhapus otomatis via ON DELETE CASCADE di database
      await client.query("DELETE FROM users WHERE user_id = $1", [id]);
      await client.query("COMMIT");
      res.json({
        message: "Pengguna dan semua data terkait berhasil dihapus.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error menghapus pengguna:", error);
      res.status(500).json({
        message: "Terjadi kesalahan pada server saat menghapus pengguna.",
      });
    } finally {
      client.release();
    }
  },

  async deleteBulkUsers(req, res) {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Daftar ID pengguna tidak valid." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM mentor_profiles WHERE mentor_id = ANY($1::int[])",
        [userIds]
      );
      // Relasi lain akan terhapus otomatis via ON DELETE CASCADE di database
      await client.query("DELETE FROM users WHERE user_id = ANY($1::int[])", [
        userIds,
      ]);
      await client.query("COMMIT");
      res.json({
        message: `${userIds.length} pengguna dan semua data terkait berhasil dihapus.`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error menghapus pengguna secara massal:", error);
      res.status(500).json({
        message: "Terjadi kesalahan pada server saat menghapus pengguna.",
      });
    } finally {
      client.release();
    }
  },

  // ==================================================
  // FUNGSI PROFIL SPESIFIK
  // ==================================================
  async getStudentProfile(req, res) {
    try {
      const { id: studentId } = req.params;
      const studentQuery = `
  SELECT
    user_id, full_name, email, phone_number, created_at,
    nickname, city, school, notes
  FROM users
  WHERE user_id = $1 AND role = 'siswa'
`;

      const packageHistoryQuery = `
        SELECT 
          up.*, p.package_name,
          (
            SELECT json_agg(json_build_object(
              'mentor_id', m.user_id,
              'full_name', m.full_name,
              'assignment_type', upm.assignment_type,
              'session_rate', upm.session_rate
            ))
            FROM user_package_mentors upm
            JOIN users m ON upm.mentor_id = m.user_id
            WHERE upm.user_package_id = up.user_package_id
          ) as mentors
        FROM user_packages up
        JOIN packages p ON up.package_id = p.package_id
        WHERE up.student_id = $1 AND up.is_hidden_by_admin = FALSE
        ORDER BY up.purchase_date DESC;
      `;

      const [studentResult, packageHistoryResult] = await Promise.all([
        pool.query(studentQuery, [studentId]),
        pool.query(packageHistoryQuery, [studentId]),
      ]);

      if (studentResult.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Profil siswa tidak ditemukan." });
      }

      res.json({
        student: studentResult.rows[0],
        packageHistory: packageHistoryResult.rows,
      });
    } catch (error) {
      console.error("Error mengambil profil siswa:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getMentorProfile(req, res) {
    try {
      const { id } = req.params;
      const mentorInfoPromise = pool.query(
        `SELECT
        u.user_id, u.full_name, u.email, u.phone_number, u.payment_type, u.nickname,
        mp.* FROM users u
      LEFT JOIN mentor_profiles mp ON u.user_id = mp.mentor_id
      WHERE u.user_id = $1 AND u.role = 'mentor'`,
        [id]
      );

      const scheduleHistoryPromise = pool.query(
        `SELECT
        s.schedule_id, s.session_datetime, s.status,
        u.full_name AS student_name,
        COALESCE(upm.session_rate, s.session_rate) AS session_rate,
        sr.payroll_status
      FROM schedules s
      LEFT JOIN users u ON s.student_id = u.user_id
      LEFT JOIN user_packages up ON s.user_package_id = up.user_package_id
      LEFT JOIN user_package_mentors upm ON up.user_package_id = upm.user_package_id AND s.mentor_id = upm.mentor_id
      LEFT JOIN session_reports sr ON s.schedule_id = sr.schedule_id
      -- ================== PERUBAHAN DI SINI ==================
      WHERE s.mentor_id = $1 AND (s.hidden_by_admin IS NULL OR s.hidden_by_admin = FALSE)
      -- =======================================================
      ORDER BY s.session_datetime DESC`,
        [id]
      );

      const [mentorInfoRes, scheduleHistoryRes] = await Promise.all([
        mentorInfoPromise,
        scheduleHistoryPromise,
      ]);

      if (mentorInfoRes.rows.length === 0) {
        return res.status(404).json({ message: "Mentor tidak ditemukan." });
      }

      const profileData = {
        mentor: mentorInfoRes.rows[0],
        scheduleHistory: scheduleHistoryRes.rows,
      };

      res.json(profileData);
    } catch (error) {
      console.error("Error mengambil profil mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },
  // ==================================================
  // FUNGSI MANAJEMEN PAKET (PACKAGES)
  // ==================================================
  async getAllPackages(req, res) {
    try {
      const query = `SELECT * FROM packages ORDER BY price ASC`;
      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil data paket:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async createPackage(req, res) {
    try {
      const {
        package_name,
        description,
        price,
        total_sessions,
        duration_days,
        curriculum,
      } = req.body;
      if (
        !package_name ||
        !price ||
        !total_sessions ||
        !duration_days ||
        !curriculum
      ) {
        return res.status(400).json({ message: "Semua field wajib diisi." });
      }
      const query = `
        INSERT INTO packages (package_name, description, price, total_sessions, duration_days, curriculum)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const newPackage = await pool.query(query, [
        package_name,
        description,
        price,
        total_sessions,
        duration_days,
        curriculum,
      ]);
      res.status(201).json({
        message: "Paket berhasil dibuat.",
        package: newPackage.rows[0],
      });
    } catch (error) {
      console.error("Error membuat paket baru:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getPackageById(req, res) {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        "SELECT * FROM packages WHERE package_id = $1",
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ message: "Paket tidak ditemukan." });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error("Error mengambil data paket by id:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async updatePackage(req, res) {
    try {
      const { id } = req.params;
      const {
        package_name,
        description,
        price,
        total_sessions,
        duration_days,
        curriculum,
      } = req.body;
      if (
        !package_name ||
        !price ||
        !total_sessions ||
        !duration_days ||
        !curriculum
      ) {
        return res.status(400).json({ message: "Semua field wajib diisi." });
      }
      const query = `
        UPDATE packages
        SET package_name = $1, description = $2, price = $3, total_sessions = $4, duration_days = $5, curriculum = $6
        WHERE package_id = $7
        RETURNING *;
      `;
      const updatedPackage = await pool.query(query, [
        package_name,
        description,
        price,
        total_sessions,
        duration_days,
        curriculum,
        id,
      ]);
      if (updatedPackage.rows.length === 0) {
        return res.status(404).json({ message: "Paket tidak ditemukan." });
      }
      res.json({
        message: "Data paket berhasil diperbarui.",
        package: updatedPackage.rows[0],
      });
    } catch (error) {
      console.error("Error update paket:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async deletePackage(req, res) {
    try {
      const { id } = req.params;
      const checkUsage = await pool.query(
        "SELECT 1 FROM user_packages WHERE package_id = $1 LIMIT 1",
        [id]
      );
      if (checkUsage.rows.length > 0) {
        return res.status(409).json({
          message:
            "Gagal menghapus: Paket ini sudah digunakan oleh siswa dan tidak dapat dihapus.",
        });
      }
      const result = await pool.query(
        "DELETE FROM packages WHERE package_id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Paket tidak ditemukan." });
      }
      res.json({ message: "Paket bimbel berhasil dihapus." });
    } catch (error) {
      console.error("Error menghapus paket:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  // ===============================================================
  // FUNGSI BARU: Menugaskan satu mentor ke paket siswa
  // ===============================================================
  async assignMentorToPackage(req, res) {
    const { user_package_id } = req.params;
    const { mentor_id, session_rate } = req.body;

    if (!mentor_id || !session_rate) {
      return res
        .status(400)
        .json({ message: "ID Mentor dan Tarif Sesi wajib diisi." });
    }

    try {
      const query = `
            INSERT INTO user_package_mentors (user_package_id, mentor_id, session_rate)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
      const { rows } = await pool.query(query, [
        user_package_id,
        mentor_id,
        session_rate,
      ]);

      res.status(201).json({
        message: "Mentor berhasil ditugaskan ke paket.",
        assignment: rows[0],
      });
    } catch (error) {
      // Menangani error jika mentor yang sama ditambahkan dua kali
      if (error.code === "23505") {
        // Kode error PostgreSQL untuk unique violation
        return res
          .status(409)
          .json({ message: "Mentor ini sudah ditugaskan ke paket tersebut." });
      }
      console.error("Error saat menugaskan mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  // ===============================================================
  // FUNGSI BARU: Menghapus satu mentor dari paket siswa
  // ===============================================================
  async removeMentorFromPackage(req, res) {
    const { user_package_id, mentor_id } = req.params;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Langkah 1: Hapus penugasan mentor dari paket
      const deleteResult = await client.query(
        "DELETE FROM user_package_mentors WHERE user_package_id = $1 AND mentor_id = $2",
        [user_package_id, mentor_id]
      );

      if (deleteResult.rowCount === 0) {
        throw new Error("Penugasan mentor tidak ditemukan untuk dihapus.");
      }

      // Langkah 2: Atasi jadwal MASA DEPAN yang dimiliki mentor yang dihapus
      // Jadwalnya tidak dihapus, hanya mentor_id-nya di-NULL-kan
      // dan statusnya diubah agar admin tahu perlu ada tindakan.
      await client.query(
        `UPDATE schedules
             SET mentor_id = NULL, status = 'pending_approval'
             WHERE user_package_id = $1 
               AND mentor_id = $2
               AND status = 'scheduled'
               AND session_datetime > NOW();`,
        [user_package_id, mentor_id]
      );

      await client.query("COMMIT");
      res.json({
        message:
          "Penugasan mentor berhasil dihapus. Jadwal mendatang memerlukan perhatian.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saat menghapus mentor dari paket:", error);
      res
        .status(500)
        .json({ message: error.message || "Terjadi kesalahan pada server." });
    } finally {
      client.release();
    }
  },

  async hideUserPackagesBulk(req, res) {
    const { userPackageIds } = req.body;
    if (
      !userPackageIds ||
      !Array.isArray(userPackageIds) ||
      userPackageIds.length === 0
    ) {
      return res.status(400).json({ message: "Daftar ID paket tidak valid." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Langkah Keamanan: Cek status paket yang akan dihapus
      const checkStatusQuery = await client.query(
        "SELECT status FROM user_packages WHERE user_package_id = ANY($1::int[])",
        [userPackageIds]
      );

      const hasActivePackage = checkStatusQuery.rows.some(
        (pkg) => pkg.status === "active"
      );
      if (hasActivePackage) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          message:
            "Gagal! Anda tidak bisa menyembunyikan paket yang statusnya masih aktif.",
        });
      }

      // Jika semua aman, lanjutkan proses hide
      const result = await client.query(
        "UPDATE user_packages SET is_hidden_by_admin = TRUE WHERE user_package_id = ANY($1::int[])",
        [userPackageIds]
      );

      await client.query("COMMIT");
      res.json({ message: `${result.rowCount} paket berhasil disembunyikan.` });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error menyembunyikan paket massal:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    } finally {
      client.release();
    }
  },

  // ==================================================
  // FUNGSI MANAJEMEN JADWAL (SCHEDULES)
  // ==================================================
  async getAllMentors(req, res) {
    try {
      const query = `
        SELECT user_id, full_name
        FROM users
        WHERE role = 'mentor'
        ORDER BY full_name ASC;
      `;
      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil data mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getGlobalSchedule(req, res) {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Parameter startDate dan endDate wajib diisi." });
      }

      const query = `
      SELECT
        s.schedule_id, 
        s.session_datetime, 
        s.status, 
        s.zoom_link,
        student.full_name AS student_name,
        mentor.full_name AS mentor_name,
        p.package_name
      FROM schedules s
      LEFT JOIN users student ON s.student_id = student.user_id -- <<< PERBAIKAN: JOIN ke siswa melalui s.student_id
      LEFT JOIN users mentor ON s.mentor_id = mentor.user_id
      LEFT JOIN user_packages up ON s.user_package_id = up.user_package_id
      LEFT JOIN packages p ON up.package_id = p.package_id
      WHERE 
        DATE(s.session_datetime) BETWEEN $1 AND $2
        AND s.hidden_by_admin = FALSE
      ORDER BY s.session_datetime ASC;
    `;

      const { rows } = await pool.query(query, [startDate, endDate]);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil jadwal global:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getScheduleRequests(req, res) {
    try {
      const query = `
        SELECT
          s.schedule_id, s.user_package_id, s.student_id,
          u.full_name AS student_name,
          p.package_name,
          s.session_datetime
        FROM schedules s
        JOIN users u ON s.student_id = u.user_id
        JOIN user_packages up ON s.user_package_id = up.user_package_id
        JOIN packages p ON up.package_id = p.package_id
        WHERE s.status = 'pending_approval'
        ORDER BY s.created_at ASC;
      `;
      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil permintaan jadwal:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async createSchedule(req, res) {
    try {
      const { user_package_id, student_id, mentor_id, session_datetime } =
        req.body;
      if (!user_package_id || !student_id || !mentor_id || !session_datetime) {
        return res.status(400).json({ message: "Semua field wajib diisi." });
      }
      const packageCheck = await pool.query(
        "SELECT remaining_sessions FROM user_packages WHERE user_package_id = $1 AND student_id = $2",
        [user_package_id, student_id]
      );

      if (
        packageCheck.rows.length === 0 ||
        packageCheck.rows[0].remaining_sessions <= 0
      ) {
        return res.status(403).json({
          message:
            "Sesi siswa ini sudah habis, siswa harus membeli paket baru.",
        });
      }
      const query = `
        INSERT INTO schedules (user_package_id, student_id, mentor_id, session_datetime, status)
        VALUES ($1, $2, $3, $4, 'scheduled')
        RETURNING *;
      `;
      const newSchedule = await pool.query(query, [
        user_package_id,
        student_id,
        mentor_id,
        session_datetime,
      ]);
      res.status(201).json({
        message: "Jadwal berhasil dibuat.",
        schedule: newSchedule.rows[0],
      });
    } catch (error) {
      console.error("Error membuat jadwal:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getScheduleById(req, res) {
    try {
      const { id } = req.params;
      const query = `
        SELECT
          s.schedule_id, s.student_id, s.mentor_id, s.session_datetime,
          u_student.full_name as student_name
        FROM schedules s
        JOIN users u_student ON s.student_id = u_student.user_id
        WHERE s.schedule_id = $1;
      `;
      const { rows } = await pool.query(query, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Jadwal tidak ditemukan." });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error("Error mengambil data jadwal by id:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async updateSchedule(req, res) {
    try {
      const { id } = req.params;
      const { mentor_id, session_datetime } = req.body;
      if (!mentor_id || !session_datetime) {
        return res
          .status(400)
          .json({ message: "Mentor dan waktu sesi wajib diisi." });
      }
      const query = `
        UPDATE schedules
        SET mentor_id = $1, session_datetime = $2, status = 'scheduled'
        WHERE schedule_id = $3
        RETURNING *;
      `;
      const updatedSchedule = await pool.query(query, [
        mentor_id,
        session_datetime,
        id,
      ]);
      if (updatedSchedule.rows.length === 0) {
        return res.status(404).json({ message: "Jadwal tidak ditemukan." });
      }
      res.json({
        message: "Jadwal berhasil diperbarui.",
        schedule: updatedSchedule.rows[0],
      });
    } catch (error) {
      console.error("Error update jadwal:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async deleteSchedule(req, res) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { id } = req.params;
      await client.query("DELETE FROM session_reports WHERE schedule_id = $1", [
        id,
      ]);
      const result = await client.query(
        "DELETE FROM schedules WHERE schedule_id = $1 RETURNING *",
        [id]
      );
      if (result.rows.length === 0) throw new Error("Jadwal tidak ditemukan.");
      await client.query("COMMIT");
      res.json({ message: "Jadwal berhasil dihapus permanen." });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error menghapus jadwal:", error);
      res
        .status(500)
        .json({ message: error.message || "Terjadi kesalahan pada server" });
    } finally {
      client.release();
    }
  },

  async hideAdminSchedules(req, res) {
    try {
      const { scheduleIds } = req.body;
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
        SET hidden_by_admin = TRUE
        WHERE schedule_id = ANY($1::int[]);
      `;
      const result = await pool.query(query, [scheduleIds]);
      res.json({
        message: `${result.rowCount} jadwal berhasil disembunyikan.`,
      });
    } catch (error) {
      console.error("Error menyembunyikan jadwal admin:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async hideTeachingHistoryBulk(req, res) {
    const { scheduleIds } = req.body; // Menerima array ID dari frontend

    if (
      !scheduleIds ||
      !Array.isArray(scheduleIds) ||
      scheduleIds.length === 0
    ) {
      return res.status(400).json({ message: "Daftar ID jadwal tidak valid." });
    }

    try {
      const query = `
      UPDATE schedules 
      SET hidden_by_admin = TRUE 
      WHERE schedule_id = ANY($1::int[]);
    `;

      const result = await pool.query(query, [scheduleIds]);

      res.json({
        message: `${result.rowCount} riwayat mengajar berhasil disembunyikan.`,
      });
    } catch (error) {
      console.error("Error saat menyembunyikan riwayat mengajar:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getMentorWeeklySchedule(req, res) {
    try {
      const { mentorId } = req.params;
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

  async setMentorWeeklySchedule(req, res) {
    const { mentorId } = req.params;
    const { schedules } = req.body;
    if (!schedules || !Array.isArray(schedules)) {
      return res
        .status(400)
        .json({ message: "Format data jadwal tidak valid." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM mentor_weekly_schedules WHERE mentor_id = $1",
        [mentorId]
      );
      for (const schedule of schedules) {
        const { day_of_week, start_time, end_time, description } = schedule;
        if (day_of_week && start_time && end_time) {
          const insertQuery = `
            INSERT INTO mentor_weekly_schedules (mentor_id, day_of_week, start_time, end_time, description)
            VALUES ($1, $2, $3, $4, $5);
          `;
          await client.query(insertQuery, [
            mentorId,
            day_of_week,
            start_time,
            end_time,
            description,
          ]);
        }
      }
      await client.query("COMMIT");
      res
        .status(201)
        .json({ message: "Jadwal pekanan mentor berhasil diperbarui." });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error mengatur jadwal pekanan mentor:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    } finally {
      client.release();
    }
  },

  // ==================================================
  // FUNGSI PEMBAYARAN & LAPORAN
  // ==================================================
  async getVerifiedCountSinceReset(req, res) {
    try {
      // Langkah 1: Ambil tanggal reset terakhir dari tabel app_settings
      const settingsQuery = `
      SELECT setting_value 
      FROM app_settings 
      WHERE setting_key = 'last_report_reset_date';
    `;
      const settingsResult = await pool.query(settingsQuery);

      // Default ke tanggal yang sangat lampau jika belum pernah di-set
      const lastResetDate =
        settingsResult.rows.length > 0
          ? settingsResult.rows[0].setting_value
          : "1970-01-01T00:00:00Z";

      // Langkah 2: Hitung laporan yang diverifikasi sejak tanggal tersebut
      const countQuery = `
      SELECT COUNT(*) 
      FROM session_reports 
      WHERE verified_by_admin = true AND verified_at >= $1;
    `;
      const { rows } = await pool.query(countQuery, [lastResetDate]);
      const count = parseInt(rows[0].count, 10);

      // Kirim juga tanggal reset terakhir ke frontend
      res.status(200).json({ count, lastResetDate });
    } catch (error) {
      console.error("Error mengambil jumlah laporan terverifikasi:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  async resetVerifiedCount(req, res) {
    try {
      const query = `
      UPDATE app_settings 
      SET setting_value = NOW() 
      WHERE setting_key = 'last_report_reset_date';
    `;
      await pool.query(query);
      res.status(200).json({ message: "Hitungan laporan berhasil direset." });
    } catch (error) {
      console.error("Error saat mereset hitungan laporan:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  async getPendingPayments(req, res) {
    try {
      const query = `
    SELECT p.payment_id, p.amount, p.payment_proof_url, p.payment_date, p.student_id,
           u.full_name as student_name, pkg.package_name
    FROM payments p
    LEFT JOIN users u ON p.student_id = u.user_id
    LEFT JOIN user_packages up ON p.user_package_id = up.user_package_id
    LEFT JOIN packages pkg ON up.package_id = pkg.package_id
    WHERE p.status = 'pending'
    ORDER BY p.payment_date ASC;
  `;
      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil pembayaran pending:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getPaymentDetailsForVerification(req, res) {
    const { payment_id } = req.params;
    try {
      const paymentDetailsPromise = pool.query(
        `SELECT p.payment_id, p.amount, p.payment_proof_url, p.payment_date,
                      u.full_name as student_name, u.email as student_email,
                      pkg.package_name, pkg.description as package_description
               FROM payments p
               JOIN users u ON p.student_id = u.user_id
               JOIN user_packages up ON p.user_package_id = up.user_package_id
               JOIN packages pkg ON up.package_id = pkg.package_id
               WHERE p.payment_id = $1`,
        [payment_id]
      );

      const availableMentorsPromise = pool.query(
        `SELECT
              u.user_id,
              u.full_name,
              COALESCE(
                  (SELECT json_agg(
                      json_build_object(
                          'day_of_week', ws.day_of_week,
                          'start_time', ws.start_time,
                          'end_time', ws.end_time
                      ) ORDER BY ws.day_of_week, ws.start_time
                  )
                  FROM mentor_weekly_schedules ws 
                  WHERE ws.mentor_id = u.user_id),
                  '[]'::json
              ) AS weekly_schedule
             FROM users u
             WHERE u.role = 'mentor' AND u.is_active = TRUE
             ORDER BY u.full_name;`
      );

      const [paymentResult, mentorsResult] = await Promise.all([
        paymentDetailsPromise,
        availableMentorsPromise,
      ]);

      if (paymentResult.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Detail pembayaran tidak ditemukan." });
      }

      res.json({
        paymentDetails: paymentResult.rows[0],
        availableMentors: mentorsResult.rows,
      });
    } catch (error) {
      console.error(
        "Error mengambil detail pembayaran untuk verifikasi:",
        error
      );
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getVerifiedPayments(req, res) {
    try {
      const { page = 1, search = "" } = req.query;
      const limit = 10;
      const offset = (page - 1) * limit;
      const searchQuery = `%${search}%`;

      const baseJoins = `
    FROM payments p
    LEFT JOIN users s ON p.student_id = s.user_id
    LEFT JOIN user_packages up ON p.user_package_id = up.user_package_id
    LEFT JOIN packages pkg ON up.package_id = pkg.package_id
    LEFT JOIN (
        SELECT 
            upm.user_package_id,
            STRING_AGG(m.full_name, ', ') as mentor_names
        FROM user_package_mentors upm
        JOIN users m ON upm.mentor_id = m.user_id
        GROUP BY upm.user_package_id
    ) AS mentor_summary ON up.user_package_id = mentor_summary.user_package_id
    LEFT JOIN users a ON p.verified_by = a.user_id
  `;

      const whereClause = `
    WHERE p.status = 'verified'
    AND p.is_deleted_by_admin = FALSE
    AND (mentor_summary.mentor_names ILIKE $1 OR s.full_name ILIKE $1)
  `;

      const dataQuery = `
    SELECT
        p.payment_id, p.verified_at,
        s.full_name as student_name,
        pkg.package_name,
        mentor_summary.mentor_names as mentor_name,
        a.full_name as admin_name
    ${baseJoins}
    ${whereClause}
    ORDER BY p.verified_at DESC
    LIMIT $2 OFFSET $3;
  `;

      const countQuery = `
    SELECT COUNT(p.payment_id)
    ${baseJoins}
    ${whereClause};
  `;

      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, [searchQuery, limit, offset]),
        pool.query(countQuery, [searchQuery]),
      ]);

      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        payments: dataResult.rows,
        totalPages: totalPages,
        currentPage: parseInt(page, 10),
      });
    } catch (error) {
      console.error("Error fetching verified payments:", error);
      res.status(500).json({ message: "Server Error" });
    }
  },

  async verifyPayment(req, res) {
    const { payment_id } = req.params;
    const adminId = req.user.id;
    const { mentors, schedule_recommendation } = req.body;

    if (!mentors || !Array.isArray(mentors) || mentors.length === 0) {
      return res.status(400).json({ message: "Data mentor tidak valid." });
    }
    const primaryMentors = mentors.filter((m) => m.assignment_type === "utama");
    if (primaryMentors.length !== 1) {
      return res
        .status(400)
        .json({ message: "Harus ada tepat satu mentor dengan tipe 'utama'." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const paymentRes = await client.query(
        `SELECT up.user_package_id, p.duration_days 
     FROM payments pay
     JOIN user_packages up ON pay.user_package_id = up.user_package_id
     JOIN packages p ON up.package_id = p.package_id
     WHERE pay.payment_id = $1 AND pay.status = 'pending' FOR UPDATE`,
        [payment_id]
      );
      if (paymentRes.rows.length === 0)
        throw new Error("Pembayaran tidak ditemukan atau sudah diverifikasi.");
      const { user_package_id, duration_days } = paymentRes.rows[0];

      await client.query(
        `UPDATE payments SET status = 'verified', verified_by = $1, verified_at = NOW() WHERE payment_id = $2`,
        [adminId, payment_id]
      );
      await client.query(
        `UPDATE user_packages
       SET status = 'active', activation_date = NOW(), expiry_date = NOW() + ($1 * INTERVAL '1 day'), schedule_recommendation = $2
       WHERE user_package_id = $3`,
        [duration_days, schedule_recommendation, user_package_id]
      );

      await client.query(
        "DELETE FROM user_package_mentors WHERE user_package_id = $1",
        [user_package_id]
      );

      for (const mentor of mentors) {
        if (
          !mentor.mentor_id ||
          !mentor.session_rate ||
          !mentor.assignment_type
        ) {
          throw new Error(`Data tidak lengkap untuk salah satu mentor.`);
        }
        await client.query(
          "INSERT INTO user_package_mentors (user_package_id, mentor_id, session_rate, assignment_type) VALUES ($1, $2, $3, $4)",
          [
            user_package_id,
            mentor.mentor_id,
            mentor.session_rate,
            mentor.assignment_type,
          ]
        );

        await client.query(
          "DELETE FROM mentor_weekly_schedules WHERE mentor_id = $1",
          [mentor.mentor_id]
        );

        if (mentor.weekly_schedule && mentor.weekly_schedule.length > 0) {
          for (const schedule of mentor.weekly_schedule) {
            await client.query(
              "INSERT INTO mentor_weekly_schedules (mentor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)",
              [
                mentor.mentor_id,
                schedule.day_of_week,
                schedule.start_time,
                schedule.end_time,
              ]
            );
          }
        }
      }

      await client.query("COMMIT");
      res.json({
        message:
          "Pembayaran berhasil diverifikasi, paket diaktifkan, dan jadwal mentor telah diatur.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saat verifikasi pembayaran:", error);
      res
        .status(500)
        .json({ message: error.message || "Terjadi kesalahan pada server." });
    } finally {
      client.release();
    }
  },

  async hideVerifiedPayments(req, res) {
    try {
      const { paymentIds } = req.body;
      if (
        !paymentIds ||
        !Array.isArray(paymentIds) ||
        paymentIds.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Daftar ID pembayaran tidak valid." });
      }
      const query = `
      UPDATE payments
      SET is_deleted_by_admin = TRUE
      WHERE payment_id = ANY($1::int[]) AND status = 'verified';
    `;
      const result = await pool.query(query, [paymentIds]);
      res.json({
        message: `${result.rowCount} riwayat pembayaran berhasil disembunyikan.`,
      });
    } catch (error) {
      console.error("Error menyembunyikan riwayat pembayaran:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  async getReports(req, res) {
    const { status = "pending", page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
      let whereClauses = ["sr.is_deleted_by_admin = FALSE"];
      const queryParams = [];

      if (status === "pending") {
        whereClauses.push("sr.verified_by_admin = FALSE");
      } else if (status === "verified") {
        whereClauses.push("sr.verified_by_admin = TRUE");
      }

      const whereString = whereClauses.join(" AND ");

      const dataQuery = `
      SELECT 
          sr.report_id, sr.summary, sr.student_development_journal, sr.material_url, sr.verified_by_admin,
          s.session_datetime,
          mentor.full_name AS mentor_name,
          student.full_name AS student_name
      FROM session_reports sr
      JOIN schedules s ON sr.schedule_id = s.schedule_id
      JOIN users mentor ON sr.mentor_id = mentor.user_id
      JOIN users student ON s.student_id = student.user_id
      WHERE ${whereString}
      ORDER BY s.session_datetime DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
    `;

      // Kita juga butuh hitungan laporan yang pending untuk kartu kedua
      const countQuery = `
      SELECT COUNT(*) FROM session_reports sr
      WHERE ${whereString};
    `;
      const pendingCountQuery = `
      SELECT COUNT(*) FROM session_reports WHERE verified_by_admin = FALSE AND is_deleted_by_admin = FALSE;
    `;

      const [dataResult, countResult, pendingCountResult] = await Promise.all([
        pool.query(dataQuery, [...queryParams, limit, offset]),
        pool.query(countQuery, queryParams),
        pool.query(pendingCountQuery),
      ]);

      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);
      const pendingCount = parseInt(pendingCountResult.rows[0].count, 10);

      res.json({ reports: dataResult.rows, totalPages, pendingCount });
    } catch (error) {
      console.error("Error mengambil laporan sesi:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  async verifySessionReport(req, res) {
    const { report_id } = req.params;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const reportUpdate = await client.query(
        `UPDATE session_reports 
     SET verified_by_admin = TRUE, verified_at = NOW() 
     WHERE report_id = $1 AND verified_by_admin = FALSE 
     RETURNING schedule_id`,
        [report_id]
      );

      if (reportUpdate.rowCount === 0) {
        throw new Error("Laporan tidak ditemukan atau sudah diverifikasi.");
      }
      const { schedule_id } = reportUpdate.rows[0];

      const scheduleResult = await client.query(
        "SELECT user_package_id FROM schedules WHERE schedule_id = $1",
        [schedule_id]
      );

      const user_package_id =
        scheduleResult.rows.length > 0
          ? scheduleResult.rows[0].user_package_id
          : null;

      if (user_package_id) {
        const updatePackageResult = await client.query(
          `UPDATE user_packages 
       SET used_sessions = used_sessions + 1
       WHERE user_package_id = $1
       RETURNING used_sessions, total_sessions`,
          [user_package_id]
        );

        const { used_sessions, total_sessions } = updatePackageResult.rows[0];

        if (used_sessions >= total_sessions) {
          await client.query(
            "UPDATE user_packages SET status = 'finished' WHERE user_package_id = $1",
            [user_package_id]
          );
        }
      }

      await client.query("COMMIT");
      res.json({
        message:
          "Laporan berhasil diverifikasi dan progres sesi siswa telah diperbarui.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error verifikasi laporan:", error);
      res
        .status(500)
        .json({ message: error.message || "Terjadi kesalahan pada server" });
    } finally {
      client.release();
    }
  },

  async hideReports(req, res) {
    try {
      const { reportIds } = req.body;
      if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
        return res
          .status(400)
          .json({ message: "Daftar ID laporan tidak valid." });
      }
      const query = `
      UPDATE session_reports
      SET is_deleted_by_admin = TRUE
      WHERE report_id = ANY($1::int[]);
    `;
      const result = await pool.query(query, [reportIds]);
      res.json({
        message: `${result.rowCount} laporan berhasil disembunyikan.`,
      });
    } catch (error) {
      console.error("Error menyembunyikan laporan:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  // ==================================================
  // FUNGSI KEUANGAN & GAJI (PAYROLL)
  // ==================================================
  async getPayrollReport(req, res) {
    const { startDate, endDate, search, page = 1, status } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
      if (!startDate || !endDate) {
        return res.status(400).json({
          message: "Rentang tanggal wajib diisi.",
        });
      }

      let query;
      let countQuery;
      let queryParams = [startDate, endDate];

      if (status === "all") {
        let searchClause = "";
        if (search) {
          // [DISESUAIKAN] Menggunakan pencarian JSONB yang efisien, bukan ILIKE.
          const searchJson = {
            mentors: [{ mentor_name: search }],
          };
          queryParams.push(JSON.stringify(searchJson));
          // Menggunakan operator '@>' yang memanfaatkan GIN Index.
          searchClause = `AND ph.details @> $${queryParams.length}`;
        }

        query = `
        SELECT 
          ph.batch_id,
          ph.payment_date,
          ph.total_amount_paid,
          ph.total_sessions_paid,
          ph.total_mentors_paid,
          a.full_name as admin_name,
          (ph.details -> 'mentors' -> 0 ->> 'mentor_name') AS mentor_name
        FROM payroll_history ph
        JOIN users a ON ph.paid_by_admin_id = a.user_id
        WHERE ph.payment_type = 'monthly'
          -- [DISESUAIKAN] Menggunakan rentang tanggal yang lebih fleksibel.
          AND ph.period_start_date >= $1 
          AND ph.period_end_date <= $2
          AND ph.is_hidden_by_admin = FALSE -- PERBAIKAN BUG
          ${searchClause}
        ORDER BY ph.payment_date DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
      `;

        countQuery = `
        SELECT COUNT(*) FROM payroll_history ph
        WHERE ph.payment_type = 'monthly'
          -- [DISESUAIKAN] Menggunakan rentang tanggal yang lebih fleksibel.
          AND ph.period_start_date >= $1
          AND ph.period_end_date <= $2
          AND ph.is_hidden_by_admin = FALSE -- PERBAIKAN BUG
          ${searchClause};
      `;
        queryParams.push(limit, offset);
      } else {
        // Logika untuk tab 'unpaid' dan 'paid' sudah solid.
        let searchClause = "";
        if (search) {
          queryParams.push(`%${search}%`);
          searchClause = `AND u.full_name ILIKE $${queryParams.length}`;
        }

        let havingClause = "";
        if (status === "unpaid") {
          havingClause = `HAVING COUNT(sr.report_id) FILTER (WHERE sr.payroll_status = 'unpaid') > 0`;
        } else if (status === "paid") {
          havingClause = `HAVING COUNT(sr.report_id) FILTER (WHERE sr.payroll_status = 'unpaid') = 0`;
        }

        query = `
        SELECT
            u.user_id AS mentor_id, u.full_name, u.email,
            SUM(CASE WHEN sr.payroll_status = 'unpaid' THEN s.session_rate ELSE 0 END) AS total_unpaid_salary,
            SUM(s.session_rate) AS total_period_salary,
            COUNT(sr.report_id) FILTER (WHERE sr.payroll_status = 'unpaid') AS unpaid_sessions,
            COUNT(sr.report_id) AS total_sessions,
            CASE 
                WHEN COUNT(sr.report_id) FILTER (WHERE sr.payroll_status = 'unpaid') > 0 THEN 'unpaid'
                ELSE 'paid'
            END AS payroll_status
        FROM users u
        JOIN schedules s ON u.user_id = s.mentor_id
        JOIN session_reports sr ON s.schedule_id = sr.schedule_id
        WHERE u.role = 'mentor' AND u.payment_type = 'monthly' AND sr.verified_by_admin = true
            AND s.hidden_from_payroll = FALSE AND s.session_datetime BETWEEN $1 AND $2
            ${searchClause}
        GROUP BY u.user_id, u.full_name, u.email
        ${havingClause}
        ORDER BY u.full_name ASC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
      `;

        countQuery = `
        SELECT COUNT(*) FROM (
          SELECT 1
          FROM users u
          JOIN schedules s ON u.user_id = s.mentor_id
          JOIN session_reports sr ON s.schedule_id = sr.schedule_id
          WHERE u.role = 'mentor' AND u.payment_type = 'monthly' AND sr.verified_by_admin = true
              AND s.hidden_from_payroll = FALSE AND s.session_datetime BETWEEN $1 AND $2
              ${searchClause}
          GROUP BY u.user_id
          ${havingClause}
        ) as count_subquery
      `;
        queryParams.push(limit, offset);
      }

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ]);

      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        dataType: status === "all" ? "history" : "summary",
        data: dataResult.rows,
        totalPages,
        currentPage: parseInt(page, 10),
      });
    } catch (error) {
      console.error("Error mengambil laporan gaji bulanan:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async getPayrollReportDetails(req, res) {
    try {
      const { mentorId } = req.params;
      const { startDate, endDate, status } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Rentang tanggal wajib diisi." });
      }

      let queryParams = [mentorId, startDate, endDate];
      let statusClause = "";

      if (status && status !== "all") {
        queryParams.push(status);
        statusClause = `AND sr.payroll_status = $${queryParams.length}`;
      }

      const query = `
      SELECT
        s.session_datetime, u_student.full_name AS student_name,
        s.mapel, sr.payroll_status, s.session_rate
      FROM schedules s
      JOIN session_reports sr ON s.schedule_id = sr.schedule_id
      JOIN users u_student ON s.student_id = u_student.user_id
      WHERE 
        s.mentor_id = $1
        AND sr.verified_by_admin = true
        AND s.hidden_from_payroll = FALSE
        AND s.session_datetime BETWEEN $2 AND $3
        ${statusClause}
      ORDER BY s.session_datetime ASC;
    `;
      const { rows } = await pool.query(query, queryParams);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil rincian laporan gaji:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async downloadPayrollDetails(req, res) {
    try {
      const { mentorId, startDate, endDate, mentorName } = req.query;
      if (!mentorId || !startDate || !endDate || !mentorName) {
        return res
          .status(400)
          .json({ message: "Data tidak lengkap untuk mengunduh laporan." });
      }
      // PERBAIKAN: Mengambil tarif hanya dari tabel schedules sebagai sumber kebenaran
      const query = `
      SELECT
          s.session_datetime,
          u_student.full_name AS student_name,
          s.mapel,
          sr.payroll_status,
          s.session_rate
      FROM schedules s
      JOIN session_reports sr ON s.schedule_id = sr.schedule_id
      JOIN users u_student ON s.student_id = u_student.user_id
      WHERE s.mentor_id = $1 
        AND sr.verified_by_admin = true 
        AND s.status != 'cancelled' 
        AND s.hidden_from_payroll = FALSE
        AND s.session_datetime BETWEEN $2 AND $3
      ORDER BY s.session_datetime ASC;
    `;
      const { rows } = await pool.query(query, [mentorId, startDate, endDate]);

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Tidak ada data untuk diunduh." });
      }

      // Proses pembuatan CSV (sudah benar)
      let csv =
        "Tanggal Sesi,Jam Sesi,Nama Siswa,Mata Pelajaran,Status Bayar,Tarif\n";
      let totalSalary = 0;
      rows.forEach((row) => {
        const date = new Date(row.session_datetime);
        const formattedDate = format(date, "dd-MM-yyyy");
        const formattedTime = format(date, "HH:mm");
        const rate = row.session_rate || 0;
        totalSalary += Number(rate);
        csv += `${formattedDate},${formattedTime},"${row.student_name}","${
          row.mapel || ""
        }","${row.payroll_status}",${rate}\n`;
      });
      csv += `\n,,,Total,,${totalSalary}`;
      const formattedStartDate = format(new Date(startDate), "dd-MM-yy");
      const formattedEndDate = format(new Date(endDate), "dd-MM-yy");
      const fileName = `RincianGaji_${mentorName.replace(
        /\s/g,
        "_"
      )}_${formattedStartDate}_${formattedEndDate}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.status(200).send(csv);
    } catch (error) {
      console.error("Error mengunduh rincian gaji:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async markMonthlyPayrollAsPaid(req, res) {
    const { mentor_id, start_date, end_date } = req.body;
    const adminId = req.user.id;

    if (!mentor_id || !start_date || !end_date) {
      return res.status(400).json({ message: "Data tidak lengkap." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Langkah 1: Update status laporan sesi (tidak ada perubahan di sini)
      const updateReportsQuery = `
      UPDATE session_reports 
      SET 
        payroll_status = 'paid',
        paid_by_admin_id = $1,
        paid_at = NOW()
      WHERE report_id IN (
        SELECT sr.report_id
        FROM session_reports sr
        JOIN schedules s ON sr.schedule_id = s.schedule_id
        WHERE s.mentor_id = $2
          AND s.session_datetime BETWEEN $3 AND $4
          AND sr.verified_by_admin = true
          AND sr.payroll_status = 'unpaid'
      )
      RETURNING report_id, schedule_id;
    `;
      const updatedReportsResult = await client.query(updateReportsQuery, [
        adminId,
        mentor_id,
        start_date,
        end_date,
      ]);

      if (updatedReportsResult.rows.length === 0) {
        throw new Error(
          "Tidak ada sesi 'Belum Lunas' yang ditemukan untuk dibayar pada periode ini."
        );
      }
      const totalSessionsPaid = updatedReportsResult.rows.length;
      const paidReportIds = updatedReportsResult.rows.map((r) => r.report_id);
      const paidScheduleIds = updatedReportsResult.rows.map(
        (r) => r.schedule_id
      );

      // Langkah 2: Hitung total nominal (tidak ada perubahan di sini)
      const sumQuery = `
      SELECT SUM(session_rate) as total_amount
      FROM schedules
      WHERE schedule_id = ANY($1::int[]);
    `;
      const sumResult = await client.query(sumQuery, [paidScheduleIds]);
      const totalAmountPaid = sumResult.rows[0].total_amount || 0;

      // [BARU] Langkah 2.5: Ambil nama mentor untuk disimpan di riwayat
      const mentorResult = await client.query(
        "SELECT full_name FROM users WHERE user_id = $1",
        [mentor_id]
      );
      const mentorName =
        mentorResult.rows[0]?.full_name || "Mentor Tidak Dikenal";

      // Langkah 3: Buat catatan di tabel payroll_history
      const historyQuery = `
      INSERT INTO payroll_history 
        (paid_by_admin_id, payment_type, period_start_date, period_end_date, total_mentors_paid, total_sessions_paid, total_amount_paid, details)
      VALUES ($1, 'monthly', $2, $3, 1, $4, $5, $6)
      RETURNING batch_id;
    `;

      // [DIUBAH] Sertakan mentor_name di dalam JSON
      const detailsJson = {
        mentors: [
          {
            mentor_id: mentor_id,
            mentor_name: mentorName,
            amount: totalAmountPaid,
            sessions_count: totalSessionsPaid,
          },
        ],
      };

      const historyResult = await client.query(historyQuery, [
        adminId,
        start_date,
        end_date,
        totalSessionsPaid,
        totalAmountPaid,
        detailsJson,
      ]);
      const newBatchId = historyResult.rows[0].batch_id;

      // Langkah 4: Hubungkan laporan dengan catatan riwayat (tidak ada perubahan di sini)
      await client.query(
        `UPDATE session_reports SET payroll_batch_id = $1 WHERE report_id = ANY($2::int[])`,
        [newBatchId, paidReportIds]
      );

      await client.query("COMMIT");

      res.json({
        message: `Pembayaran gaji untuk ${totalSessionsPaid} sesi berhasil dicatat.`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error menandai gaji bulanan lunas:", error);
      res
        .status(500)
        .json({ message: error.message || "Terjadi kesalahan pada server" });
    } finally {
      client.release();
    }
  },

  async hidePayrollHistory(req, res) {
    try {
      const { batchIds } = req.body;
      if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
        return res
          .status(400)
          .json({ message: "Daftar ID transaksi tidak valid." });
      }
      const query = `
            UPDATE payroll_history
            SET is_hidden_by_admin = TRUE
            WHERE batch_id = ANY($1::int[]);
        `;
      const result = await pool.query(query, [batchIds]);
      res.json({
        message: `${result.rowCount} riwayat pembayaran berhasil disembunyikan.`,
      });
    } catch (error) {
      console.error("Error menyembunyikan riwayat pembayaran:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  async getPayrollHistoryDetails(req, res) {
    try {
      const { batch_id } = req.params;
      const query = `
        SELECT s.session_datetime, u.full_name AS student_name, s.mapel, s.session_rate
        FROM session_reports sr
        JOIN schedules s ON sr.schedule_id = s.schedule_id
        JOIN users u ON s.student_id = u.user_id
        WHERE sr.payroll_batch_id = $1
        ORDER BY s.session_datetime;
      `;
      const { rows } = await pool.query(query, [batch_id]);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil rincian riwayat gaji:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async hideMonthlyPayrolls(req, res) {
    try {
      const { payrollsToHide } = req.body;
      if (
        !payrollsToHide ||
        !Array.isArray(payrollsToHide) ||
        payrollsToHide.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Data riwayat gaji tidak valid." });
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        let totalHidden = 0;
        for (const payroll of payrollsToHide) {
          const query = `
            UPDATE session_reports SET is_deleted_by_admin = TRUE
            WHERE report_id IN (
              SELECT sr.report_id
              FROM session_reports sr
              JOIN schedules s ON sr.schedule_id = s.schedule_id
              WHERE sr.mentor_id = $1 AND s.session_datetime BETWEEN $2 AND $3
            );
          `;
          const result = await client.query(query, [
            payroll.mentor_id,
            payroll.start_date,
            payroll.end_date,
          ]);
          totalHidden += result.rowCount;
        }
        await client.query("COMMIT");
        res.json({
          message: `Total ${totalHidden} sesi dari riwayat gaji terpilih berhasil disembunyikan.`,
        });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error menyembunyikan riwayat gaji:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  // =================================================================
  // == FUNGSI GAJI HARIAN (DIPERBAIKI)
  // =================================================================
  async getDailyPayroll(req, res) {
    const { startDate, endDate, search, page = 1, status } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Rentang tanggal wajib diisi." });
      }

      let query;
      let countQuery;
      let queryParams = [startDate, endDate];

      if (status === "all") {
        let searchClause = "";
        if (search) {
          // Menggunakan pencarian JSONB yang efisien untuk nama mentor.
          const searchJson = {
            mentors: [{ mentor_name: search }],
          };
          queryParams.push(JSON.stringify(searchJson));
          searchClause = `AND ph.details @> $${queryParams.length}`;
        }

        query = `
        SELECT 
          ph.batch_id, ph.payment_date, ph.total_amount_paid,
          ph.total_sessions_paid, ph.total_mentors_paid, a.full_name as admin_name, (ph.details -> 'mentors' -> 0 ->> 'mentor_name') AS mentor_name
        FROM payroll_history ph
        JOIN users a ON ph.paid_by_admin_id = a.user_id
        WHERE ph.payment_type = 'daily'
          -- Menggunakan rentang tanggal yang lebih fleksibel
          AND ph.period_start_date >= $1 
          AND ph.period_end_date <= $2
          AND ph.is_hidden_by_admin = FALSE -- PERBAIKAN BUG INI 🔥
          ${searchClause}
        ORDER BY ph.payment_date DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
      `;

        countQuery = `
        SELECT COUNT(*) FROM payroll_history ph
        WHERE ph.payment_type = 'daily'
          -- Menggunakan rentang tanggal yang lebih fleksibel
          AND ph.period_start_date >= $1
          AND ph.period_end_date <= $2
          AND ph.is_hidden_by_admin = FALSE -- PERBAIKAN BUG INI 🔥
          ${searchClause};
      `;
        queryParams.push(limit, offset);
      } else {
        // Logika untuk tab 'unpaid' dan 'paid' sudah solid, tidak ada perubahan.
        let searchClause = "";
        if (search) {
          queryParams.push(`%${search}%`);
          searchClause = `AND u.full_name ILIKE $${queryParams.length}`;
        }

        let havingClause = "";
        if (status === "unpaid") {
          havingClause = `HAVING COUNT(sr.report_id) FILTER (WHERE sr.payroll_status = 'unpaid') > 0`;
        } else if (status === "paid") {
          havingClause = `HAVING COUNT(sr.report_id) FILTER (WHERE sr.payroll_status = 'unpaid') = 0`;
        }

        query = `
        SELECT
            u.user_id AS mentor_id, u.full_name, u.email,
            SUM(CASE WHEN sr.payroll_status = 'unpaid' THEN s.session_rate ELSE 0 END) AS total_unpaid_salary,
            SUM(s.session_rate) AS total_period_salary,
            COUNT(sr.report_id) FILTER (WHERE sr.payroll_status = 'unpaid') AS unpaid_sessions,
            CASE 
                WHEN COUNT(sr.report_id) FILTER (WHERE sr.payroll_status = 'unpaid') > 0 THEN 'unpaid'
                ELSE 'paid'
            END AS payroll_status
        FROM users u
        JOIN schedules s ON u.user_id = s.mentor_id
        JOIN session_reports sr ON s.schedule_id = sr.schedule_id
        WHERE u.role = 'mentor' AND u.payment_type = 'daily' AND sr.verified_by_admin = true
            AND s.hidden_from_payroll = FALSE AND s.session_datetime::date BETWEEN $1 AND $2
            ${searchClause}
        GROUP BY u.user_id, u.full_name, u.email
        ${havingClause}
        ORDER BY u.full_name ASC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2};
      `;

        countQuery = `
        SELECT COUNT(*) FROM (
          SELECT 1
          FROM users u
          JOIN schedules s ON u.user_id = s.mentor_id
          JOIN session_reports sr ON s.schedule_id = sr.schedule_id
          WHERE u.role = 'mentor' AND u.payment_type = 'daily' AND sr.verified_by_admin = true
              AND s.hidden_from_payroll = FALSE AND s.session_datetime::date BETWEEN $1 AND $2
              ${searchClause}
          GROUP BY u.user_id
          ${havingClause}
        ) as count_subquery
      `;
        queryParams.push(limit, offset);
      }

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, queryParams.slice(0, -2)),
      ]);

      const totalItems = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        dataType: status === "all" ? "history" : "summary",
        data: dataResult.rows,
        totalPages,
        currentPage: parseInt(page, 10),
      });
    } catch (error) {
      console.error("Error mengambil data gaji harian:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },
  
  async getDailyPayrollDetails(req, res) {
    const { mentorId } = req.params;
    const { startDate, endDate, status } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Rentang tanggal wajib diisi." });
    }
    try {
      let queryParams = [mentorId, startDate, endDate];
      let statusClause = "";

      if (status && status !== "all") {
        queryParams.push(status);
        statusClause = `AND sr.payroll_status = $${queryParams.length}`;
      }

      const query = `
      SELECT s.schedule_id, s.session_datetime, u_student.full_name AS student_name,
             s.mapel, sr.payroll_status, s.session_rate
      FROM schedules s
      JOIN session_reports sr ON s.schedule_id = sr.schedule_id
      JOIN users u_student ON s.student_id = u_student.user_id
      WHERE s.mentor_id = $1
        AND sr.verified_by_admin = true
        AND s.hidden_from_payroll = FALSE
        AND s.session_datetime BETWEEN $2 AND $3
        ${statusClause}
      ORDER BY s.session_datetime ASC;
    `;
      const { rows } = await pool.query(query, queryParams);
      res.json(rows);
    } catch (error) {
      console.error("Error mengambil rincian gaji harian:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
  },

  async markDailyMentorPayrollAsPaid(req, res) {
    const { mentor_id, start_date, end_date } = req.body;
    const adminId = req.user.id;

    if (!mentor_id || !start_date || !end_date) {
      return res.status(400).json({ message: "Data tidak lengkap." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Langkah 1: Update status laporan sesi menjadi 'paid'
      const updateReportsQuery = `
      UPDATE session_reports 
      SET 
        payroll_status = 'paid', 
        paid_by_admin_id = $1, 
        paid_at = NOW()
      WHERE report_id IN (
        SELECT sr.report_id 
        FROM session_reports sr
        JOIN schedules s ON sr.schedule_id = s.schedule_id
        WHERE s.mentor_id = $2
          AND s.session_datetime BETWEEN $3 AND $4
          AND sr.verified_by_admin = TRUE
          AND sr.payroll_status = 'unpaid'
      )
      RETURNING report_id, schedule_id;
    `;
      const updatedReportsResult = await client.query(updateReportsQuery, [
        adminId,
        mentor_id,
        start_date,
        end_date,
      ]);

      if (updatedReportsResult.rows.length === 0) {
        throw new Error(
          "Tidak ada sesi 'Belum Lunas' yang ditemukan untuk dibayar pada periode ini."
        );
      }
      const totalSessionsPaid = updatedReportsResult.rows.length;
      const paidReportIds = updatedReportsResult.rows.map((r) => r.report_id);
      const paidScheduleIds = updatedReportsResult.rows.map(
        (r) => r.schedule_id
      );

      // Langkah 2: Hitung total nominal yang dibayarkan
      const sumQuery = `
      SELECT SUM(session_rate) as total_amount
      FROM schedules
      WHERE schedule_id = ANY($1::int[]);
    `;
      const sumResult = await client.query(sumQuery, [paidScheduleIds]);
      const totalAmountPaid = sumResult.rows[0].total_amount || 0;

      // Langkah 2.5: Ambil nama mentor untuk disimpan di riwayat
      const mentorResult = await client.query(
        "SELECT full_name FROM users WHERE user_id = $1",
        [mentor_id]
      );
      const mentorName =
        mentorResult.rows[0]?.full_name || "Mentor Tidak Dikenal";

      // Langkah 3: Buat catatan baru di riwayat pembayaran (payroll_history)
      const historyQuery = `
      INSERT INTO payroll_history 
        (paid_by_admin_id, payment_type, period_start_date, period_end_date, total_mentors_paid, total_sessions_paid, total_amount_paid, details)
      VALUES ($1, 'daily', $2, $3, 1, $4, $5, $6)
      RETURNING batch_id;
    `;

      const detailsJson = {
        mentors: [
          {
            mentor_id: mentor_id,
            mentor_name: mentorName,
            amount: totalAmountPaid,
            sessions_count: totalSessionsPaid,
          },
        ],
      };

      const historyResult = await client.query(historyQuery, [
        adminId,
        start_date,
        end_date,
        totalSessionsPaid,
        totalAmountPaid,
        detailsJson,
      ]);
      const newBatchId = historyResult.rows[0].batch_id;

      // Langkah 4: Hubungkan laporan sesi dengan catatan riwayat pembayaran
      await client.query(
        `UPDATE session_reports SET payroll_batch_id = $1 WHERE report_id = ANY($2::int[])`,
        [newBatchId, paidReportIds]
      );

      await client.query("COMMIT");

      res.json({
        message: `Pembayaran gaji harian untuk ${totalSessionsPaid} sesi berhasil dicatat.`,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saat menandai lunas gaji harian:", error);
      res
        .status(500)
        .json({ message: error.message || "Terjadi kesalahan pada server." });
    } finally {
      client.release();
    }
  },

  async createAnnouncement(req, res) {
    const { title, message, target_role } = req.body;
    if (!title || !message || !target_role) {
      return res
        .status(400)
        .json({ message: "Judul, pesan, dan target peran wajib diisi." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Simpan pengumuman ke database
      const annResult = await client.query(
        "INSERT INTO announcements (title, message, target_role) VALUES ($1, $2, $3) RETURNING announcement_id",
        [title, message, target_role]
      );
      const announcementId = annResult.rows[0].announcement_id;

      // 2. Cari semua user yang menjadi target (tidak termasuk admin)
      const usersResult = await client.query(
        "SELECT user_id FROM users WHERE (role = $1 OR $1 = 'all') AND role != 'admin'",
        [target_role]
      );
      const userIds = usersResult.rows.map((u) => u.user_id);

      if (userIds.length > 0) {
        // --- PERBAIKAN LOGIKA UTAMA DI SINI ---
        // 3. Kembali ke cara yang lebih aman untuk membuat status "belum dibaca"
        const statusPromises = userIds.map((userId) => {
          return client.query(
            "INSERT INTO user_announcement_status (user_id, announcement_id) VALUES ($1, $2)",
            [userId, announcementId]
          );
        });
        await Promise.all(statusPromises);
        // --- AKHIR PERBAIKAN ---

        // 4. Ambil semua "alamat" notifikasi push milik target
        const subsResult = await client.query(
          "SELECT subscription_data FROM push_subscriptions WHERE user_id = ANY($1::int[])",
          [userIds]
        );
        const subscriptions = subsResult.rows.map((s) => s.subscription_data);

        // 5. Kirim notifikasi push ke semua target
        const payload = { title, body: message };
        if (subscriptions.length > 0) {
          const pushPromises = subscriptions.map((sub) =>
            triggerPushNotification(sub, payload)
          );
          await Promise.all(pushPromises);
        }

        await client.query("COMMIT");
        res.status(201).json({
          message: `Pengumuman berhasil dibuat dan notifikasi dikirim ke ${subscriptions.length} perangkat.`,
        });
      } else {
        await client.query("COMMIT");
        res.status(201).json({
          message:
            "Pengumuman berhasil dibuat, namun tidak ada target penerima notifikasi.",
        });
      }
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error membuat pengumuman:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    } finally {
      client.release();
    }
  },
};

module.exports = adminController;
