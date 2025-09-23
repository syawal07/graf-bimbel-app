"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Image from "next/image";

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
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
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

const EmptyState = ({ message, showButton = true }) => (
  <div className="text-center p-10 min-h-screen bg-gray-100 flex flex-col justify-center items-center">
    <Icon
      path="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      className="mx-auto h-16 w-16 text-gray-400"
    />
    <p className="mt-4 text-xl font-semibold text-gray-700">{message}</p>
    {showButton && (
      <Link
        href="/dashboard/admin/users"
        className="mt-6 inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 font-semibold transition-colors"
      >
        <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
        Kembali ke Manajemen Pengguna
      </Link>
    )}
  </div>
);

// --- Komponen Badge Status ---
const StatusBadge = ({ text, color }) => {
  const colors = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    yellow: "bg-yellow-100 text-yellow-800",
    gray: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
        colors[color] || colors.gray
      } capitalize`}
    >
      {text}
    </span>
  );
};

// --- Komponen untuk menampilkan detail dengan Ikon ---
const DetailItem = ({ label, value, iconPath }) => (
  <div className="flex items-start gap-3">
    <Icon
      path={iconPath}
      className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
    />
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900 font-medium">{value || "-"}</p>
    </div>
  </div>
);

// --- Komponen Jadwal Pekanan (UI DIROMBAK TOTAL) ---
const WeeklyScheduleView = ({ scheduleData, isLoading }) => {
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const timeSlots = Array.from(
    { length: 15 },
    (_, i) => `${String(i + 7).padStart(2, "0")}:00`
  );

  if (isLoading)
    return (
      <div className="text-center p-8">
        <LoadingSpinner text="Memuat jadwal..." />
      </div>
    );
  if (scheduleData.length === 0)
    return (
      <div className="p-6 border-2 border-dashed rounded-lg">
        <EmptyState
          message="Mentor ini belum memiliki jadwal tetap."
          showButton={false}
        />
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-lg shadow border bg-white">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-50/75 sticky top-0 z-20">
          <tr>
            <th className="p-3 border-b border-r font-semibold text-gray-700 w-24">
              Waktu
            </th>
            {days.map((day) => (
              <th
                key={day}
                className="p-3 border-b font-semibold text-gray-700 min-w-[150px]"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {timeSlots.map((time) => (
            <tr key={time} className="divide-x divide-gray-200">
              <td className="p-3 border-r font-semibold bg-gray-50/50 sticky left-0 z-10 w-24 text-gray-600 text-center">
                {time}
              </td>
              {days.map((day, dayIndex) => {
                const schedulesInSlot = scheduleData.filter(
                  (s) =>
                    s.day_of_week === dayIndex + 1 &&
                    s.start_time.startsWith(time.split(":")[0])
                );
                return (
                  <td key={day} className="p-1.5 border-t align-top h-24">
                    {schedulesInSlot.map((schedule) => (
                      <div
                        key={schedule.weekly_schedule_id}
                        className="text-xs text-left p-2 mb-1 bg-orange-50 rounded-md border-l-4 border-orange-400 hover:shadow-md transition-shadow"
                      >
                        <p className="font-bold text-orange-900 truncate">
                          {schedule.description}
                        </p>
                        <p className="text-orange-800/80">{`${format(
                          new Date(`1970-01-01T${schedule.start_time}`),
                          "HH:mm"
                        )} - ${format(
                          new Date(`1970-01-01T${schedule.end_time}`),
                          "HH:mm"
                        )}`}</p>
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function AdminMentorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const { id: mentorId } = params;

  const [imageSrc, setImageSrc] = useState("/assets/img/default-avatar.png");
  const DEFAULT_AVATAR = "/assets/img/default-avatar.png";

  const [activeTab, setActiveTab] = useState("history");
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);

  // BARU: State untuk menyimpan ID riwayat mengajar yang dipilih
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);

  const fetchProfile = useCallback(async () => {
    if (mentorId) {
      setIsLoading(true);
      setIsLoadingWeekly(true);
      const token = localStorage.getItem("token");
      try {
        const profilePromise = axios.get(
          `/api/admin/mentors/${mentorId}/profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const weeklySchedulePromise = axios.get(
          `/api/admin/mentors/${mentorId}/weekly-schedule`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const [profileRes, weeklyScheduleRes] = await Promise.all([
          profilePromise,
          weeklySchedulePromise,
        ]);

        setProfile(profileRes.data);
        setWeeklySchedule(weeklyScheduleRes.data);

        if (profileRes.data?.mentor?.profile_picture_url) {
          setImageSrc(`/${profileRes.data.mentor.profile_picture_url}`);
        } else {
          setImageSrc(DEFAULT_AVATAR);
        }
      } catch (error) {
        toast.error("Gagal memuat profil mentor.");
        setImageSrc(DEFAULT_AVATAR);
        setProfile(null);
      } finally {
        setIsLoading(false);
        setIsLoadingWeekly(false);
      }
    }
  }, [mentorId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // BARU: Handler untuk memilih satu riwayat
  const handleSelectHistory = (scheduleId) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  // BARU: Handler untuk memilih semua riwayat
  const handleSelectAllHistory = (e) => {
    if (e.target.checked) {
      setSelectedHistoryIds(profile.scheduleHistory.map((s) => s.schedule_id));
    } else {
      setSelectedHistoryIds([]);
    }
  };

  // BARU: Fungsi untuk menyembunyikan/menghapus riwayat yang dipilih
  const handleBulkHideHistory = async () => {
    if (selectedHistoryIds.length === 0) {
      toast.warn("Pilih setidaknya satu riwayat untuk dihapus.");
      return;
    }
    if (
      !window.confirm(
        `Yakin ingin menghapus ${selectedHistoryIds.length} riwayat dari tampilan ini? Operasi ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `/api/admin/schedules/hide-history`,
        { scheduleIds: selectedHistoryIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update UI secara real-time
      setProfile((currentProfile) => ({
        ...currentProfile,
        scheduleHistory: currentProfile.scheduleHistory.filter(
          (session) => !selectedHistoryIds.includes(session.schedule_id)
        ),
      }));

      toast.success(`${selectedHistoryIds.length} riwayat berhasil dihapus.`);
      setSelectedHistoryIds([]); // Kosongkan pilihan
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghapus riwayat.");
    }
  };

  if (isLoading) return <LoadingSpinner text="Memuat profil mentor..." />;
  if (!profile) return <EmptyState message="Profil mentor tidak ditemukan." />;

  const { mentor, scheduleHistory } = profile;

  return (
    <div className="bg-gray-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Link
            href="/dashboard/admin/users"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
          >
            <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
            Kembali ke Manajemen Pengguna
          </Link>
        </div>

        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-2xl shadow-lg mb-8 flex items-center space-x-6">
          <Image
            key={imageSrc}
            src={imageSrc}
            alt="Foto Profil"
            width={96}
            height={96}
            className="w-24 h-24 rounded-full border-4 border-white object-cover bg-gray-200"
            onError={() => setImageSrc(DEFAULT_AVATAR)}
            priority
          />
          <div>
            <h1 className="text-3xl font-bold text-white">
              {mentor.full_name}
            </h1>
            <p className="text-white/80">{mentor.email}</p>
            <p className="text-white/80 capitalize">
              {mentor.payment_type} Payment
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">
                Data Pribadi
              </h3>
              <div className="space-y-4">
                <DetailItem
                  label="Nama Panggilan"
                  value={mentor.nickname}
                  iconPath="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
                <DetailItem
                  label="Jenis Kelamin"
                  value={mentor.gender}
                  iconPath="M12 4.248c-3.148-5.454-10.976-4.504-10.976 2.502 0 6.47 10.976 13.25 10.976 13.25s10.976-6.78 10.976-13.25c0-7.006-7.828-7.952-10.976-2.502z"
                />
                <DetailItem
                  label="Tanggal Lahir"
                  value={
                    mentor.date_of_birth
                      ? format(new Date(mentor.date_of_birth), "dd MMMM yyyy", {
                          locale: id,
                        })
                      : "-"
                  }
                  iconPath="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
                />
                <DetailItem
                  label="Domisili"
                  value={mentor.domicile}
                  iconPath="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h4.5V16.5"
                />
                <DetailItem
                  label="No. Telepon"
                  value={mentor.phone_number}
                  iconPath="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z"
                />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">
                Akademik & Keahlian
              </h3>
              <div className="space-y-4">
                <DetailItem
                  label="Pendidikan Terakhir"
                  value={mentor.last_education}
                  iconPath="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18"
                />
                <DetailItem
                  label="Jurusan"
                  value={mentor.major}
                  iconPath="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0l-2.072-1.037a3.75 3.75 0 01-1.92-3.142V4.5A2.25 2.25 0 015.25 2.25h13.5A2.25 2.25 0 0121 4.5v1.267a3.75 3.75 0 01-1.92 3.142l-2.072 1.037m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M12 13.489v5.821"
                />
                <DetailItem
                  label="Mapel Keahlian"
                  value={mentor.expert_subjects?.join(", ")}
                  iconPath="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6-2.292m0 0v14.25"
                />
                <DetailItem
                  label="Jenjang Ajar"
                  value={mentor.teachable_levels?.join(", ")}
                  iconPath="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125V6.375m1.125 13.125A1.125 1.125 0 004.5 18.375h15A1.125 1.125 0 0020.625 19.5m0 0V6.375m0 13.125A1.125 1.125 0 0119.5 18.375h-15a1.125 1.125 0 01-1.125 1.125m17.25 0h.008v.008h-.008v-.008zm-17.25 0h.008v.008h-.008v-.008z"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("history")}
                  className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "history"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Riwayat Mengajar
                </button>
                <button
                  onClick={() => setActiveTab("weekly")}
                  className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "weekly"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Jadwal Tetap
                </button>
              </nav>
            </div>

            <div>
              {activeTab === "history" ? (
                <div>
                  {/* BARU: Kontrol untuk Hapus Massal */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        onChange={handleSelectAllHistory}
                        checked={
                          scheduleHistory?.length > 0 &&
                          selectedHistoryIds.length === scheduleHistory.length
                        }
                        disabled={
                          !scheduleHistory || scheduleHistory.length === 0
                        }
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Pilih Semua
                      </label>
                    </div>

                    {selectedHistoryIds.length > 0 && (
                      <button
                        onClick={handleBulkHideHistory}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                      >
                        <Icon
                          path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          className="w-4 h-4"
                        />
                        Hapus ({selectedHistoryIds.length})
                      </button>
                    )}
                  </div>

                  {/* DIUBAH: Daftar Riwayat Mengajar */}
                  <div className="space-y-4">
                    {scheduleHistory && scheduleHistory.length > 0 ? (
                      scheduleHistory.map((session) => (
                        <div
                          key={session.schedule_id}
                          className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                            selectedHistoryIds.includes(session.schedule_id)
                              ? "bg-orange-50 border-orange-200"
                              : "hover:bg-gray-50/75"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 flex-shrink-0"
                            checked={selectedHistoryIds.includes(
                              session.schedule_id
                            )}
                            onChange={() =>
                              handleSelectHistory(session.schedule_id)
                            }
                          />
                          <div className="flex-grow">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-gray-800">
                                  {session.student_name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {format(
                                    new Date(session.session_datetime),
                                    "EEEE, dd MMMM yyyy",
                                    { locale: id }
                                  )}
                                </p>
                              </div>
                              <StatusBadge
                                text={session.payroll_status || "Unpaid"}
                                color={
                                  session.payroll_status === "paid"
                                    ? "green"
                                    : "yellow"
                                }
                              />
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-sm text-gray-600">
                                Tarif Sesi:{" "}
                                <span className="font-semibold text-gray-800">
                                  {session.session_rate
                                    ? `Rp ${new Intl.NumberFormat(
                                        "id-ID"
                                      ).format(session.session_rate)}`
                                    : "-"}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 border-2 border-dashed rounded-lg">
                        <EmptyState
                          message="Belum ada riwayat mengajar."
                          showButton={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <WeeklyScheduleView
                  scheduleData={weeklySchedule}
                  isLoading={isLoadingWeekly}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
