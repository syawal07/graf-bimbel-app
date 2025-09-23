const pool = require("../config/db");

const contentController = {
  // =================================================================
  // == FUNGSI UNTUK KEUNGGULAN (ADVANTAGES)
  // =================================================================
  async getAdvantages(req, res) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM advantages ORDER BY id ASC"
      );
      res.status(200).json(rows);
    } catch (error) {
      console.error("Error saat mengambil data keunggulan:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async createAdvantage(req, res) {
    const { title, description, icon_svg } = req.body;
    try {
      const query = `INSERT INTO advantages (title, description, icon_svg) VALUES ($1, $2, $3) RETURNING *`;
      const { rows } = await pool.query(query, [title, description, icon_svg]);
      res.status(201).json(rows[0]);
    } catch (error) {
      console.error("Error saat membuat keunggulan baru:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async updateAdvantage(req, res) {
    const { id } = req.params;
    const { title, description, icon_svg } = req.body;
    try {
      const query = `UPDATE advantages SET title = $1, description = $2, icon_svg = $3 WHERE id = $4 RETURNING *`;
      const { rows } = await pool.query(query, [
        title,
        description,
        icon_svg,
        id,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Keunggulan tidak ditemukan." });
      }
      res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error saat memperbarui keunggulan ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async deleteAdvantage(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query("DELETE FROM advantages WHERE id = $1", [
        id,
      ]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Keunggulan tidak ditemukan." });
      }
      res.status(200).json({ message: "Keunggulan berhasil dihapus." });
    } catch (error) {
      console.error(`Error saat menghapus keunggulan ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  // =================================================================
  // == FUNGSI UNTUK FAQ
  // =================================================================
  async getFaqs(req, res) {
    try {
      const { rows } = await pool.query("SELECT * FROM faqs ORDER BY id ASC");
      res.status(200).json(rows);
    } catch (error) {
      console.error("Error saat mengambil data FAQ:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async createFaq(req, res) {
    const { question, answer } = req.body;
    try {
      const query = `INSERT INTO faqs (question, answer) VALUES ($1, $2) RETURNING *`;
      const { rows } = await pool.query(query, [question, answer]);
      res.status(201).json(rows[0]);
    } catch (error) {
      console.error("Error saat membuat FAQ baru:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async updateFaq(req, res) {
    const { id } = req.params;
    const { question, answer } = req.body;
    try {
      const query = `UPDATE faqs SET question = $1, answer = $2 WHERE id = $3 RETURNING *`;
      const { rows } = await pool.query(query, [question, answer, id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "FAQ tidak ditemukan." });
      }
      res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error saat memperbarui FAQ ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async deleteFaq(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query("DELETE FROM faqs WHERE id = $1", [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "FAQ tidak ditemukan." });
      }
      res.status(200).json({ message: "FAQ berhasil dihapus." });
    } catch (error) {
      console.error(`Error saat menghapus FAQ ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  // =================================================================
  // == FUNGSI PENGATURAN SITUS (LOGO, URL REGISTRASI, FOOTER)
  // =================================================================
  async getPublicSettings(req, res) {
    try {
      const { rows } = await pool.query(
        "SELECT setting_key, setting_value FROM site_settings"
      );
      const settings = rows.reduce((acc, row) => {
        acc[row.setting_key] = row.setting_value;
        return acc;
      }, {});
      res.status(200).json(settings);
    } catch (error) {
      console.error("Error mengambil pengaturan publik:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async updateSiteSettings(req, res) {
    const settings = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const query = `
        INSERT INTO site_settings (setting_key, setting_value) 
        VALUES ($1, $2)
        ON CONFLICT (setting_key) 
        DO UPDATE SET 
          setting_value = EXCLUDED.setting_value,
          updated_at = NOW();
      `;
      for (const key in settings) {
        if (Object.hasOwnProperty.call(settings, key)) {
          await client.query(query, [key, settings[key]]);
        }
      }
      await client.query("COMMIT");
      res
        .status(200)
        .json({ message: "Pengaturan situs berhasil diperbarui." });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error saat memperbarui pengaturan situs:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    } finally {
      client.release();
    }
  },
  async updateLogo(req, res) {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Tidak ada file logo yang diunggah." });
    }
    const logoUrl = req.file.path.replace(/\\/g, "/");
    try {
      const query = `
            INSERT INTO site_settings (setting_key, setting_value) VALUES ('logo_url', $1)
            ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
        `;
      await pool.query(query, [logoUrl]);
      res.status(200).json({ message: "Logo berhasil diperbarui.", logoUrl });
    } catch (error) {
      console.error("Error saat memperbarui logo:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  // =================================================================
  // == FUNGSI UNTUK HERO SLIDER
  // =================================================================
  async getHeroSlides(req, res) {
    try {
      const query = `SELECT * FROM hero_slides WHERE is_active = TRUE ORDER BY display_order ASC, id ASC`;
      const { rows } = await pool.query(query);
      res.status(200).json(rows);
    } catch (error) {
      console.error("Error mengambil hero slides:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async getAllHeroSlides(req, res) {
    try {
      const query =
        "SELECT * FROM hero_slides ORDER BY display_order ASC, id ASC";
      const { rows } = await pool.query(query);
      res.status(200).json(rows);
    } catch (error) {
      console.error("Error mengambil semua hero slides untuk admin:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async createHeroSlide(req, res) {
    if (!req.file) {
      return res.status(400).json({ message: "File media wajib diunggah." });
    }
    const { title, subtitle, cta_text, cta_url, display_order, is_active } =
      req.body;
    const media_url = req.file.path.replace(/\\/g, "/");
    const media_type = req.file.mimetype.startsWith("video")
      ? "video"
      : "image";
    try {
      const query = `INSERT INTO hero_slides (title, subtitle, cta_text, cta_url, media_url, media_type, display_order, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
      const values = [
        title,
        subtitle,
        cta_text,
        cta_url,
        media_url,
        media_type,
        display_order || 0,
        is_active === "true" || is_active === true,
      ];
      const { rows } = await pool.query(query, values);
      res.status(201).json(rows[0]);
    } catch (error) {
      console.error("Error saat membuat hero slide:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async updateHeroSlide(req, res) {
    const { id } = req.params;
    const { title, subtitle, cta_text, cta_url, display_order, is_active } =
      req.body;
    try {
      const fieldsToUpdate = {
        title,
        subtitle,
        cta_text,
        cta_url,
        display_order,
        is_active: is_active === "true" || is_active === true,
      };
      if (req.file) {
        fieldsToUpdate.media_url = req.file.path.replace(/\\/g, "/");
        fieldsToUpdate.media_type = req.file.mimetype.startsWith("video")
          ? "video"
          : "image";
      }
      const setClauses = Object.keys(fieldsToUpdate)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");
      const queryParams = [...Object.values(fieldsToUpdate), id];
      const query = `UPDATE hero_slides SET ${setClauses} WHERE id = $${queryParams.length} RETURNING *`;
      const { rows } = await pool.query(query, queryParams);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Slide tidak ditemukan." });
      }
      res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error saat memperbarui slide ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
  async deleteHeroSlide(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query("DELETE FROM hero_slides WHERE id = $1", [
        id,
      ]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Slide tidak ditemukan." });
      }
      res.status(200).json({ message: "Slide berhasil dihapus." });
    } catch (error) {
      console.error(`Error saat menghapus slide ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  // =================================================================
  // == [BARU] FUNGSI UNTUK METODE PEMBAYARAN
  // =================================================================

  /**
   * @description [PUBLIK] Mengambil metode pembayaran yang aktif.
   */
  async getPublicPaymentMethods(req, res) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM payment_methods WHERE is_active = TRUE ORDER BY display_order ASC"
      );
      res.status(200).json(rows);
    } catch (error) {
      console.error("Error mengambil metode pembayaran publik:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  /**
   * @description [ADMIN] Mengambil semua metode pembayaran.
   */
  async getAllPaymentMethods(req, res) {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM payment_methods ORDER BY display_order ASC"
      );
      res.status(200).json(rows);
    } catch (error) {
      console.error("Error mengambil semua metode pembayaran:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  /**
   * @description [ADMIN] Membuat metode pembayaran baru.
   */
  async createPaymentMethod(req, res) {
    const {
      bank_name,
      account_number,
      account_holder_name,
      display_order,
      is_active,
    } = req.body;
    const logo_url = req.file ? req.file.path.replace(/\\/g, "/") : null;

    try {
      const query = `
        INSERT INTO payment_methods (bank_name, account_number, account_holder_name, logo_url, display_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `;
      const values = [
        bank_name,
        account_number,
        account_holder_name,
        logo_url,
        display_order || 0,
        is_active === "true" || is_active === true,
      ];
      const { rows } = await pool.query(query, values);
      res.status(201).json(rows[0]);
    } catch (error) {
      console.error("Error membuat metode pembayaran:", error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  /**
   * @description [ADMIN] Memperbarui metode pembayaran.
   */
  async updatePaymentMethod(req, res) {
    const { id } = req.params;
    const {
      bank_name,
      account_number,
      account_holder_name,
      display_order,
      is_active,
    } = req.body;

    try {
      const fieldsToUpdate = {
        bank_name,
        account_number,
        account_holder_name,
        display_order,
        is_active: is_active === "true" || is_active === true,
      };

      if (req.file) {
        fieldsToUpdate.logo_url = req.file.path.replace(/\\/g, "/");
      }

      const setClauses = Object.keys(fieldsToUpdate)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");
      const queryParams = [...Object.values(fieldsToUpdate), id];
      const query = `UPDATE payment_methods SET ${setClauses} WHERE id = $${queryParams.length} RETURNING *`;

      const { rows } = await pool.query(query, queryParams);
      if (rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Metode pembayaran tidak ditemukan." });
      }
      res.status(200).json(rows[0]);
    } catch (error) {
      console.error(`Error memperbarui metode pembayaran ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },

  /**
   * @description [ADMIN] Menghapus metode pembayaran.
   */
  async deletePaymentMethod(req, res) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        "DELETE FROM payment_methods WHERE id = $1",
        [id]
      );
      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ message: "Metode pembayaran tidak ditemukan." });
      }
      res.status(200).json({ message: "Metode pembayaran berhasil dihapus." });
    } catch (error) {
      console.error(`Error menghapus metode pembayaran ID ${id}:`, error);
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  },
};

module.exports = contentController;
