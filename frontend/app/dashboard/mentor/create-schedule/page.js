"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

registerLocale("id", id);
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
  <div className="text-center p-10 bg-white rounded-2xl shadow-lg">
    <Icon
      path="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      className="mx-auto h-12 w-12 text-gray-400"
    />
    <p className="mt-4 font-semibold text-gray-700">{message}</p>
    <p className="mt-1 text-sm text-gray-500">
      Anda akan dapat membuat jadwal setelah admin menugaskan siswa kepada Anda.
    </p>
    <Link
      href={buttonLink}
      className="mt-6 inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 font-semibold transition-colors text-sm"
    >
      <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
      {buttonText}
    </Link>
  </div>
);

export default function CreateSchedulePage() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [sessionDatetime, setSessionDatetime] = useState(new Date());
  const [zoomLink, setZoomLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newScheduleInfo, setNewScheduleInfo] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const router = useRouter();

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    const fetchAssignedStudents = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get("/api/mentor/assigned-packages", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(response.data);
      } catch (error) {
        toast.error("Gagal memuat data siswa.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignedStudents();
  }, []);

  const handleStudentChange = (e) => {
    const studentValue = e.target.value;
    setSelectedStudent(studentValue);
    if (studentValue) {
      const [student_id, user_package_id] = studentValue.split("|");
      const selected = students.find(
        (s) =>
          s.student_id === parseInt(student_id) &&
          s.user_package_id === parseInt(user_package_id)
      );
      setStudentDetails(selected);
    } else {
      setStudentDetails(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !sessionDatetime) {
      toast.warn("Harap pilih siswa dan tentukan waktu sesi.");
      return;
    }
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    const [student_id, user_package_id] = selectedStudent.split("|");
    try {
      await axios.post(
        "/api/mentor/schedules",
        {
          student_id: parseInt(student_id),
          user_package_id: parseInt(user_package_id),
          session_datetime: sessionDatetime,
          zoom_link: zoomLink,
          mapel: studentDetails?.package_name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Jadwal berhasil dibuat!");
      setNewScheduleInfo({
        studentName: studentDetails.student_name,
        dateTime: sessionDatetime,
        zoomLink: zoomLink,
      });
      setShowSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal membuat jadwal.");
      setIsSubmitting(false);
    }
  };

  const generateWhatsAppMessage = () => {
    if (!newScheduleInfo) return "";
    const date = new Date(newScheduleInfo.dateTime);
    const formattedDate = format(date, "eeee, dd MMMM yyyy", { locale: id });
    const formattedTime = format(date, "HH.mm", { locale: id });
    let message = `*Info Jadwal Graf Bimbel:*\n\n`;
    message += `Halo *${newScheduleInfo.studentName}*, jadwal les kamu sudah diatur untuk:\n\n`;
    message += `🗓️ *Hari/Tanggal:* ${formattedDate}\n`;
    message += `⏰ *Jam:* ${formattedTime} WIB\n\n`;
    if (newScheduleInfo.zoomLink) {
      message += `🔗 *Link Sesi:* ${newScheduleInfo.zoomLink}\n\n`;
    }
    message += `Mohon persiapannya ya. Terima kasih! ✨`;
    return encodeURIComponent(message);
  };

  const baseInputStyle =
    "block w-full rounded-lg border-gray-300 shadow-sm text-black placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 px-4 py-2.5";

  if (isLoading) return <LoadingSpinner text="Memuat data siswa..." />;

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
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />{" "}
              Kembali ke Dashboard
            </Link>
          </div>

          {!showSuccess ? (
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
              {students.length === 0 ? (
                <EmptyState
                  message="Anda belum memiliki siswa yang ditugaskan."
                  buttonText="Kembali ke Dashboard"
                  buttonLink="/dashboard/mentor"
                />
              ) : (
                <>
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      Buat Jadwal Baru
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Pilih siswa yang ditugaskan dan atur jadwal sesi.
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-2">
                      <label
                        htmlFor="student"
                        className="block text-sm font-medium text-gray-700"
                      >
                        1. Pilih Siswa & Paket
                      </label>
                      <select
                        id="student"
                        value={selectedStudent}
                        onChange={handleStudentChange}
                        className={baseInputStyle}
                      >
                        <option value="">
                          -- Pilih dari siswa yang ditugaskan --
                        </option>
                        {students.map((student) => (
                          <option
                            key={student.user_package_id}
                            value={`${student.student_id}|${student.user_package_id}`}
                          >
                            {student.student_name} ({student.package_name})
                          </option>
                        ))}
                      </select>
                    </div>

                    {studentDetails && (
                      <div className="rounded-lg bg-orange-50/50 p-4 border border-orange-200 space-y-3">
                        <h4 className="text-sm font-bold text-gray-800">
                          Informasi Penting Siswa:
                        </h4>
                        <div className="flex items-start gap-3 text-sm text-gray-600">
                          <Icon
                            path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5"
                          />
                          <p>
                            <strong className="text-gray-700">
                              Rekomendasi Admin:
                            </strong>{" "}
                            <em className="text-orange-800">
                              &quot;
                              {studentDetails.schedule_recommendation ||
                                "Tidak ada rekomendasi spesifik."}
                              &quot;
                            </em>
                          </p>
                        </div>
                        <div className="flex items-start gap-3 text-sm text-gray-600">
                          <Icon
                            path="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M12 14.25a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m9 16.5A2.25 2.25 0 0019.5 21h.625a2.25 2.25 0 002.25-2.25V15m-3 0V9"
                            className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5"
                          />
                          <p>
                            <strong className="text-gray-700">Catatan:</strong>{" "}
                            {studentDetails.notes || "Tidak ada catatan."}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pt-8 border-t">
                      <label className="block text-sm font-medium text-gray-700">
                        2. Atur Detail Sesi
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <DatePicker
                          selected={sessionDatetime}
                          onChange={(date) => setSessionDatetime(date)}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="d MMMM yyyy, HH:mm"
                          locale="id"
                          className={baseInputStyle}
                          popperPlacement="top-start"
                        />
                        <input
                          type="url"
                          name="zoom_link"
                          id="zoom_link"
                          value={zoomLink}
                          onChange={(e) => setZoomLink(e.target.value)}
                          className={baseInputStyle}
                          placeholder="Link Zoom/Meet (Opsional)"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end items-center gap-4 pt-6 border-t border-gray-200">
                      <Link
                        href="/dashboard/mentor"
                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
                      >
                        Batal
                      </Link>
                      <button
                        type="submit"
                        disabled={isSubmitting || !selectedStudent}
                        className="inline-flex justify-center items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-yellow-500 to-orange-500 border border-transparent rounded-lg shadow-sm hover:opacity-90 disabled:opacity-50"
                      >
                        {isSubmitting && (
                          <svg
                            className="animate-spin -ml-1 mr-2 h-5 w-5"
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
                        {isSubmitting ? "Menyimpan..." : "Simpan Jadwal"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-lg text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Icon
                  path="M4.5 12.75l6 6 9-13.5"
                  className="h-6 w-6 text-green-600"
                />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">
                Jadwal Berhasil Dibuat!
              </h2>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                Periksa kembali detail di bawah sebelum membagikannya ke siswa
                melalui WhatsApp.
              </p>

              <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg border space-y-3">
                <div className="flex items-start gap-3">
                  <Icon
                    path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    className="w-5 h-5 text-gray-500 mt-0.5"
                  />
                  <p className="text-sm text-gray-600">
                    <strong>Siswa:</strong> {newScheduleInfo?.studentName}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Icon
                    path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
                    className="w-5 h-5 text-gray-500 mt-0.5"
                  />
                  <p className="text-sm text-gray-600">
                    <strong>Waktu:</strong>{" "}
                    {newScheduleInfo?.dateTime
                      ? format(
                          new Date(newScheduleInfo.dateTime),
                          "eeee, dd MMMM yyyy 'pukul' HH:mm",
                          { locale: id }
                        )
                      : "-"}{" "}
                    WIB
                  </p>
                </div>
                {newScheduleInfo?.zoomLink && (
                  <div className="flex items-start gap-3">
                    <Icon
                      path="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                      className="w-5 h-5 text-gray-500 mt-0.5"
                    />
                    <p className="text-sm text-gray-600">
                      <strong>Link:</strong>{" "}
                      <a
                        href={newScheduleInfo.zoomLink}
                        className="text-blue-600 break-all"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {newScheduleInfo.zoomLink}
                      </a>
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 space-y-4">
                <a
                  href={`https://wa.me/?text=${generateWhatsAppMessage()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full justify-center items-center gap-3 px-6 py-3 bg-green-500 text-white rounded-md font-semibold hover:bg-green-600 shadow-sm"
                >
                  <svg
                    className="w-5 h-5"
                    role="img"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <title>WhatsApp</title>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-..57-.01s-.52.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.785 1.65c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Share via WhatsApp
                </a>
                <Link
                  href="/dashboard/mentor"
                  className="inline-block text-sm font-semibold text-orange-600 hover:underline"
                >
                  Buat Jadwal Lain atau Kembali
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
