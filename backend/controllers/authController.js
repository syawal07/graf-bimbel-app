const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const authController = {
  // --- FUNGSI REGISTER ---
  async register(req, res) {
    try {
      const { full_name, email, password, phone_number, role } = req.body;
      if (!full_name || !email || !password || !phone_number || !role) {
        return res.status(400).json({ message: "Semua data wajib diisi." });
      }
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Email sudah digunakan." });
      }
      const hashedPassword = await bcrypt.hash(password, 10);

      let newUser;
      const userData = {
        full_name,
        email,
        password_hash: hashedPassword,
        phone_number,
      };

      if (role === "admin") {
        newUser = await User.createAdmin(userData);
      } else if (role === "mentor") {
        newUser = await User.createMentor(userData);
      } else if (role === "siswa") {
        newUser = await User.createUser(userData);
      } else {
        return res.status(400).json({ message: "Role tidak valid." });
      }

      res.status(201).json({ message: "Registrasi berhasil!", user: newUser });
    } catch (error) {
      console.error("Error saat register:", error);
      res.status(500).json({ message: "Terjadi kesalahan saat registrasi." });
    }
  },

  // --- FUNGSI LOGIN ---
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email dan password wajib diisi." });
      }
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email atau password salah." });
      }
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: "Email atau password salah." });
      }
      const payload = { user: { id: user.user_id, role: user.role } };
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
        (err, token) => {
          if (err) throw err;
          res.json({
            message: "Login berhasil!",
            token,
            user: {
              id: user.user_id,
              full_name: user.full_name,
              email: user.email,
              role: user.role,
            },
          });
        }
      );
    } catch (error) {
      console.error("Error pada login:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  // --- FUNGSI UNTUK MENGAMBIL DATA USER LOGIN ---
  async getMe(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Pengguna tidak ditemukan." });
      }
      const { password_hash, ...userData } = user;
      res.json(userData);
    } catch (error) {
      console.error("Error mengambil data 'me':", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
};

module.exports = authController;
