"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

// --- Komponen Input Field dengan Ikon dan Label ---
const InputField = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  iconPath,
  required = false,
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
        className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-4 text-black shadow-sm placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
      />
    </div>
  </div>
);

const baseInputStyle =
  "block w-full rounded-lg border-gray-300 shadow-sm text-black placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 px-4 py-2.5";

// --- Komponen Skeleton untuk Form ---
const FormSkeleton = () => (
  <div className="p-6 sm:p-8 space-y-8 animate-pulse">
    <div className="space-y-6">
      <div className="h-5 bg-gray-200 rounded w-1/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="mt-4 space-y-4">
        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
        <div className="h-20 bg-gray-200 rounded-lg w-full"></div>
      </div>
    </div>
    <div className="space-y-6 pt-8 border-t">
      <div className="h-5 bg-gray-200 rounded w-1/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
      </div>
      <div className="mt-4 h-10 bg-gray-200 rounded-lg w-full"></div>
      <div className="mt-4 h-10 bg-gray-200 rounded-lg w-full"></div>
    </div>
  </div>
);

export default function EditPackagePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [formData, setFormData] = useState({
    package_name: "",
    description: "",
    price: "",
    total_sessions: "",
    duration_days: "",
    curriculum: "nasional",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalPackageName, setOriginalPackageName] = useState("");

  useEffect(() => {
    if (id) {
      const fetchPackageData = async () => {
        const token = localStorage.getItem("token");
        try {
          const response = await axios.get(`/api/admin/packages/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const {
            package_name,
            description,
            price,
            total_sessions,
            duration_days,
            curriculum,
          } = response.data;
          setFormData({
            package_name: package_name || "",
            description: description || "",
            price: price || "",
            total_sessions: total_sessions || "",
            duration_days: duration_days || "",
            curriculum: curriculum || "nasional",
          });
          setOriginalPackageName(response.data.package_name);
        } catch (err) {
          toast.error("Gagal memuat data paket.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchPackageData();
    }
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      await axios.put(`/api/admin/packages/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Paket berhasil diperbarui!");
      setTimeout(() => router.push("/dashboard/admin/packages"), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui paket.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <ToastContainer position="top-center" theme="colored" />
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/admin/packages"
            className="flex items-center gap-2 text-gray-700 hover:text-black font-semibold transition-colors"
          >
            <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
            Kembali ke Manajemen Paket
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-white">Edit Paket Bimbel</h1>
            <p className="text-white/90 mt-2">
              Perbarui detail untuk paket{" "}
              <span className="font-bold">{originalPackageName}</span>.
            </p>
          </div>

          {isLoading ? (
            <FormSkeleton />
          ) : (
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
              {/* --- Bagian Informasi Utama --- */}
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Informasi Paket
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Detail utama yang akan dilihat oleh siswa.
                  </p>
                </div>
                <InputField
                  label="Nama Paket"
                  name="package_name"
                  value={formData.package_name}
                  onChange={handleChange}
                  placeholder="Contoh: Intensif UTBK - Saintek"
                  iconPath="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4"
                  required
                />
                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700"
                  >
                    Deskripsi
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                    className={baseInputStyle}
                    placeholder="Jelaskan secara singkat tentang paket ini..."
                  ></textarea>
                </div>
              </div>

              {/* --- Bagian Detail & Harga --- */}
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detail & Harga
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Atur harga, jumlah sesi, dan durasi paket.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Harga (Rp)"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="Contoh: 1500000"
                    iconPath="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m3-3.75l-3.75-3.75M15.75 12l-3.75-3.75M15.75 12l3.75 3.75M15.75 12l3.75-3.75"
                    required
                  />
                  <InputField
                    label="Jumlah Sesi"
                    name="total_sessions"
                    type="number"
                    value={formData.total_sessions}
                    onChange={handleChange}
                    placeholder="Contoh: 10"
                    iconPath="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    required
                  />
                </div>
                <InputField
                  label="Durasi Paket (dalam hari)"
                  name="duration_days"
                  type="number"
                  value={formData.duration_days}
                  onChange={handleChange}
                  placeholder="Contoh: 30"
                  iconPath="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
                  required
                />
                <div className="space-y-2">
                  <label
                    htmlFor="curriculum"
                    className="text-sm font-medium text-gray-700"
                  >
                    Kurikulum
                  </label>
                  <select
                    id="curriculum"
                    name="curriculum"
                    value={formData.curriculum}
                    onChange={handleChange}
                    className={baseInputStyle}
                  >
                    <option value="nasional">Nasional</option>
                    <option value="nasional_plus">Nasional Plus</option>
                    <option value="internasional">Internasional</option>
                    <option value="olimpiade">Olimpiade</option>
                    <option value="utbk">UTBK</option>
                    <option value="mahasiswa">Mahasiswa</option>
                    <option value="tahsin">Tahsin/Tilawah</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 pt-6 border-t border-gray-200">
                <Link
                  href="/dashboard/admin/packages"
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
                  {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
