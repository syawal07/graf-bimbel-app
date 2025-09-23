"use client";

import { useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// --- Komponen Ikon ---
const Icon = ({ path, className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

// --- Komponen Input Field ---
const InputField = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  iconPath,
  required = false,
  autoComplete,
}) => (
  <div className="space-y-2">
    <label htmlFor={name} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Icon path={iconPath} className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-4 text-black shadow-sm placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
      />
    </div>
  </div>
);

const baseStyle =
  "block w-full rounded-lg border-gray-300 shadow-sm text-black placeholder:text-gray-500 focus:border-black focus:ring-black px-4 py-2.5";

export default function AddUserPage() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "siswa",
    phone_number: "",
    payment_type: "monthly",
    nickname: "",
    city: "",
    school: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ===== PERBAIKAN UTAMA DI SINI =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post("/api/admin/users", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Pengguna baru berhasil dibuat!");

      // Logika baru: arahkan ke tab yang sesuai
      const destinationTab = formData.role === "mentor" ? "mentor" : "siswa";
      setTimeout(() => {
        router.push(`/dashboard/admin/users?tab=${destinationTab}`);
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat pengguna.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <ToastContainer position="top-center" theme="colored" />
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/admin/users"
            className="flex items-center gap-2 text-gray-700 hover:text-black font-semibold transition-colors"
          >
            <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
            Kembali ke Manajemen Pengguna
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-white">
              Tambah Pengguna Baru
            </h1>
            <p className="text-white/90 mt-2">
              Isi detail di bawah untuk membuat akun siswa atau mentor baru.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
            <div className="space-y-6">
              <div className="pb-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-black">
                  Informasi Akun
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Data utama untuk login dan kontak pengguna.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pt-2">
                <InputField
                  label="Nama Lengkap"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="cth: John Doe"
                  iconPath="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  required
                />
                <InputField
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="cth: john.doe@example.com"
                  iconPath="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  required
                />
                <InputField
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimal 8 karakter"
                  iconPath="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  required
                />
                <InputField
                  label="Nomor Telepon"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="cth: 081234567890"
                  iconPath="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z"
                />
                <div className="md:col-span-2 space-y-2">
                  <label
                    htmlFor="role"
                    className="text-sm font-medium text-gray-700"
                  >
                    Role Pengguna
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={baseStyle}
                  >
                    <option value="siswa">Siswa</option>
                    <option value="mentor">Mentor</option>
                  </select>
                </div>
              </div>
            </div>
            {formData.role === "siswa" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-black">
                    Detail Informasi Siswa
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Informasi tambahan yang spesifik untuk siswa.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pt-2">
                  <InputField
                    label="Nama Panggilan"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    placeholder="cth: John"
                    iconPath="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275"
                  />
                  <InputField
                    label="Asal Kota"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="cth: Jakarta"
                    iconPath="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                  />
                  <div className="md:col-span-2">
                    <InputField
                      label="Asal Sekolah"
                      name="school"
                      value={formData.school}
                      onChange={handleChange}
                      placeholder="cth: SMA Negeri 1 Jakarta"
                      iconPath="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label
                      htmlFor="notes"
                      className="text-sm font-medium text-gray-700"
                    >
                      Catatan Khusus (jika ada)
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Tuliskan catatan khusus di sini..."
                      rows="3"
                      className={baseStyle}
                    ></textarea>
                  </div>
                </div>
              </div>
            )}
            {formData.role === "mentor" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-black">
                    Informasi Gaji
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Pilih skema pembayaran gaji untuk mentor.
                  </p>
                </div>
                <div className="pt-2 space-y-2">
                  <label
                    htmlFor="payment_type"
                    className="text-sm font-medium text-gray-700"
                  >
                    Skema Pembayaran
                  </label>
                  <select
                    id="payment_type"
                    name="payment_type"
                    value={formData.payment_type}
                    onChange={handleChange}
                    className={baseStyle}
                  >
                    <option value="monthly">Bulanan (Monthly)</option>
                    <option value="daily">Harian (Daily)</option>
                  </select>
                </div>
              </div>
            )}
            <div className="flex justify-end items-center gap-4 pt-6 border-t border-gray-200">
              <Link
                href="/dashboard/admin/users"
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {isSubmitting && (
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {isSubmitting ? "Menyimpan..." : "Simpan Pengguna"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
