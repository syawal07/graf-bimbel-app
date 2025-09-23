"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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

// --- Komponen UI Tambahan ---
const LoadingSpinner = ({ text }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <svg
      className="animate-spin h-10 w-10 text-orange-500"
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
    <p className="mt-4 text-lg font-medium text-gray-700">{text}</p>
  </div>
);

const EmptyState = ({ message, buttonText, buttonLink }) => (
  <div className="text-center p-10">
    <Icon
      path="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      className="mx-auto h-12 w-12 text-gray-400"
    />
    <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
    <Link
      href={buttonLink}
      className="mt-6 inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 font-semibold transition-colors text-sm"
    >
      <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
      {buttonText}
    </Link>
  </div>
);

export default function CreateReportPage() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [formData, setFormData] = useState({
    schedule_id: "",
    summary: "",
    student_development_journal: "",
    student_attended: true,
  });
  const [materialFile, setMaterialFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    const fetchCompletedSessions = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get("/api/mentor/sessions-for-reporting", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSessions(response.data);
      } catch (error) {
        toast.error("Gagal memuat data sesi.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompletedSessions();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    setMaterialFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schedule_id || !formData.summary) {
      toast.warn("Harap pilih sesi dan isi rangkuman materi.");
      return;
    }
    setIsSubmitting(true);
    const token = localStorage.getItem("token");

    const data = new FormData();
    data.append("schedule_id", formData.schedule_id);
    data.append("summary", formData.summary);
    data.append(
      "student_development_journal",
      formData.student_development_journal
    );
    data.append("student_attended", formData.student_attended);
    if (materialFile) {
      data.append("sessionMaterial", materialFile);
    }

    try {
      await axios.post("/api/mentor/reports", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Laporan berhasil dibuat!");
      setTimeout(() => router.push("/dashboard/mentor"), 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat laporan.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner text="Memuat data sesi..." />;

  const baseInputStyle =
    "block w-full rounded-lg border-gray-300 shadow-sm text-black placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 px-4 py-2.5";

  return (
    <div className="relative bg-gray-50 min-h-screen">
      <ToastContainer position="top-center" theme="colored" />
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-r from-yellow-400 to-orange-500">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            particles: {
              number: { value: 30 },
              color: { value: "#ffffff" },
              opacity: { value: 0.2 },
              size: { value: { min: 1, max: 3 } },
              move: { enable: true, speed: 0.5 },
              links: {
                enable: true,
                color: "#ffffff",
                opacity: 0.1,
                distance: 150,
              },
            },
          }}
        />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link
              href="/dashboard/mentor"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors text-sm"
            >
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
              Kembali ke Dashboard
            </Link>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h1 className="text-3xl font-bold text-gray-900">
                Buat Laporan Sesi
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Isi detail laporan untuk sesi yang telah selesai.
              </p>
            </div>

            {sessions.length === 0 && !isLoading ? (
              <EmptyState
                message="Tidak ada sesi yang perlu dilaporkan saat ini."
                buttonText="Kembali ke Dashboard"
                buttonLink="/dashboard/mentor"
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* --- Bagian 1: Pilih Sesi --- */}
                <div className="space-y-2">
                  <label
                    htmlFor="schedule_id"
                    className="text-sm font-medium text-gray-700"
                  >
                    Pilih Sesi yang Sudah Selesai{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="schedule_id"
                    name="schedule_id"
                    value={formData.schedule_id}
                    onChange={handleInputChange}
                    className={baseInputStyle}
                  >
                    <option value="">-- Pilih Sesi dari Riwayat --</option>
                    {sessions.map((session) => (
                      <option
                        key={session.schedule_id}
                        value={session.schedule_id}
                      >
                        {session.student_name} -{" "}
                        {format(
                          new Date(session.session_datetime),
                          "dd MMM yyyy, HH:mm",
                          { locale: id }
                        )}
                      </option>
                    ))}
                  </select>
                </div>

                {/* --- Bagian 2: Detail Laporan --- */}
                <div className="space-y-6 pt-6 border-t">
                  <div className="space-y-2">
                    <label
                      htmlFor="summary"
                      className="text-sm font-medium text-gray-700"
                    >
                      Rangkuman Materi (WAJIB){" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="summary"
                      name="summary"
                      rows="4"
                      value={formData.summary}
                      onChange={handleInputChange}
                      className={baseInputStyle}
                      required
                      placeholder="Contoh: Membahas bab 1 tentang aljabar, fokus pada persamaan linear..."
                    ></textarea>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="student_development_journal"
                      className="text-sm font-medium text-gray-700"
                    >
                      Jurnal Perkembangan Siswa (WAJIB)
                    </label>
                    <textarea
                      id="student_development_journal"
                      name="student_development_journal"
                      rows="4"
                      value={formData.student_development_journal}
                      onChange={handleInputChange}
                      className={baseInputStyle}
                      placeholder="Contoh: Siswa menunjukkan peningkatan dalam memahami konsep X, namun masih perlu latihan di topik Y..."
                    ></textarea>
                  </div>
                </div>

                {/* --- Bagian 3: Lampiran & Kehadiran --- */}
                <div className="space-y-6 pt-6 border-t">
                  <div className="space-y-2">
                    <label
                      htmlFor="sessionMaterial"
                      className="text-sm font-medium text-gray-700"
                    >
                      Unggah File Pembahasan (WAJIB)
                    </label>
                    <label
                      htmlFor="sessionMaterial"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500"
                    >
                      <div className="flex items-center gap-4 px-4 py-2.5 border-2 border-dashed rounded-lg">
                        <Icon
                          path="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V6.75A4.5 4.5 0 017.5 2.25h9A4.5 4.5 0 0121 6.75v10.5A4.5 4.5 0 0116.5 21h-9A4.5 4.5 0 013 17.25z"
                          className="w-8 h-8 text-gray-400"
                        />
                        <div>
                          <p className="text-sm text-orange-600">
                            Klik untuk mengunggah file
                          </p>
                          <p className="text-xs text-gray-500">
                            {materialFile
                              ? materialFile.name
                              : "PDF, DOCX, JPG, PNG (maks. 5MB)"}
                          </p>
                        </div>
                      </div>
                      <input
                        id="sessionMaterial"
                        name="sessionMaterial"
                        type="file"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="student_attended"
                      className="text-sm font-medium text-gray-700"
                    >
                      Siswa Hadir?
                    </label>
                    <label
                      htmlFor="student_attended"
                      className="inline-flex relative items-center cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        id="student_attended"
                        name="student_attended"
                        checked={formData.student_attended}
                        onChange={handleInputChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-orange-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {formData.student_attended
                          ? "Ya, Hadir"
                          : "Tidak Hadir"}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 border-t pt-6">
                  <Link
                    href="/dashboard/mentor"
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
                    {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
