"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// --- KOMPONEN ---

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

const EmptyState = ({ message }) => (
  <div className="text-center p-10 border-2 border-dashed rounded-lg">
    <Icon
      path="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      className="mx-auto h-12 w-12 text-gray-400"
    />
    <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
  </div>
);

const baseInputStyle =
  "block w-full rounded-lg border-gray-300 shadow-sm text-black placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 px-4 py-2.5";

const FormSection = ({ title, description, children }) => (
  <div className="md:grid md:grid-cols-3 md:gap-6 py-8">
    <div className="md:col-span-1">
      <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
    <div className="mt-5 md:mt-0 md:col-span-2">
      <div className="space-y-6">{children}</div>
    </div>
  </div>
);

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
  if (!scheduleData || scheduleData.length === 0)
    return (
      <EmptyState message="Anda belum memiliki jadwal tetap yang diatur oleh admin." />
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
                  <td key={day} className="p-1.5 align-top h-24">
                    {schedulesInSlot.map((schedule) => (
                      <div
                        key={schedule.weekly_schedule_id}
                        className="text-xs text-left p-2 mb-1 bg-orange-50 rounded-md border-l-4 border-orange-400"
                      >
                        <p className="font-bold text-orange-900 truncate">
                          {schedule.description}
                        </p>
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

// --- HALAMAN UTAMA ---
export default function MentorProfilePage() {
  const [profile, setProfile] = useState({});
  const [scheduleHistory, setScheduleHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const [imageSrc, setImageSrc] = useState("/assets/img/default-avatar.png");
  const DEFAULT_AVATAR = "/assets/img/default-avatar.png";

  const [activeTab, setActiveTab] = useState("profile");
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);

  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const fetchProfileAndSchedule = useCallback(async () => {
    setIsLoading(true);
    setIsLoadingWeekly(true);
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Sesi tidak valid, silakan login kembali.");
      setIsLoading(false);
      return;
    }

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const profilePromise = axios.get("/api/mentor/profile", config);
      const weeklySchedulePromise = axios.get(
        "/api/mentor/my-weekly-schedule",
        config
      );

      const [profileRes, weeklyScheduleRes] = await Promise.all([
        profilePromise,
        weeklySchedulePromise,
      ]);

      const mentorData = profileRes.data.mentor;
      const historyData = profileRes.data.scheduleHistory;

      mentorData.expert_subjects = Array.isArray(mentorData.expert_subjects)
        ? mentorData.expert_subjects.join(", ")
        : "";
      mentorData.teachable_levels = Array.isArray(mentorData.teachable_levels)
        ? mentorData.teachable_levels.join(", ")
        : "";

      setProfile(mentorData);
      setScheduleHistory(historyData);
      setWeeklySchedule(weeklyScheduleRes.data);

      setImageSrc(
        mentorData.profile_picture_url
          ? `/${mentorData.profile_picture_url}`
          : DEFAULT_AVATAR
      );
    } catch (error) {
      toast.error("Gagal memuat data profil.");
      setImageSrc(DEFAULT_AVATAR);
    } finally {
      setIsLoading(false);
      setIsLoadingWeekly(false);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    fetchProfileAndSchedule();
  }, [fetchProfileAndSchedule]);

  const handleSelectHistory = (scheduleId) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleSelectAllHistory = (e) => {
    if (e.target.checked) {
      setSelectedHistoryIds(scheduleHistory.map((s) => s.schedule_id));
    } else {
      setSelectedHistoryIds([]);
    }
  };

  const handleBulkHideHistory = async () => {
    if (selectedHistoryIds.length === 0) {
      toast.warn("Pilih setidaknya satu riwayat untuk dihapus.");
      return;
    }
    if (
      !window.confirm(
        `Yakin ingin menyembunyikan ${selectedHistoryIds.length} riwayat dari tampilan Anda?`
      )
    ) {
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `/api/mentor/my-schedules/hide-bulk`,
        { scheduleIds: selectedHistoryIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setScheduleHistory((currentHistory) =>
        currentHistory.filter(
          (session) => !selectedHistoryIds.includes(session.schedule_id)
        )
      );

      toast.success(
        `${selectedHistoryIds.length} riwayat berhasil disembunyikan.`
      );
      setSelectedHistoryIds([]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal menyembunyikan riwayat."
      );
    }
  };

  const handleChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setImageSrc(URL.createObjectURL(file));
    }
  };

  const handleCertificateChange = (e) => {
    const file = e.target.files[0];
    if (file) setCertificateFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();

    Object.keys(profile).forEach((key) => {
      if (profile[key] !== null && profile[key] !== undefined) {
        formData.append(key, profile[key]);
      }
    });

    if (profilePictureFile)
      formData.append("profile_picture", profilePictureFile);
    if (certificateFile) formData.append("certificate", certificateFile);

    try {
      const response = await axios.put("/api/mentor/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Profil berhasil diperbarui!");
      const updatedProfile = response.data.profile;

      updatedProfile.expert_subjects = Array.isArray(
        updatedProfile.expert_subjects
      )
        ? updatedProfile.expert_subjects.join(", ")
        : "";
      updatedProfile.teachable_levels = Array.isArray(
        updatedProfile.teachable_levels
      )
        ? updatedProfile.teachable_levels.join(", ")
        : "";
      setProfile(updatedProfile);

      if (updatedProfile.profile_picture_url) {
        setImageSrc(
          `/${updatedProfile.profile_picture_url}?t=${new Date().getTime()}`
        );
      }

      setProfilePictureFile(null);
      setCertificateFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui profil.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner text="Memuat profil..." />;

  return (
    <div className="relative bg-gray-50 min-h-screen">
      {isClient && <ToastContainer position="top-center" theme="colored" />}
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
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href="/dashboard/mentor"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors text-sm"
            >
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />{" "}
              Kembali ke Dashboard
            </Link>
          </div>

          <div className="bg-white/20 backdrop-blur-lg p-6 rounded-2xl shadow-lg mb-8 flex items-center space-x-6 border border-white/20">
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
                {profile.full_name || "Nama Mentor"}
              </h1>
              <p className="text-white/80">{profile.email}</p>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "profile"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Edit Profil
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "history"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Riwayat Mengajar
                </button>
                <button
                  onClick={() => setActiveTab("weekly")}
                  className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "weekly"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Jadwal Tetap Saya
                </button>
              </nav>
            </div>
            {activeTab === "profile" ? (
              <form onSubmit={handleSubmit}>
                <div className="space-y-8 divide-y divide-gray-200">
                  <FormSection
                    title="Data Pribadi"
                    description="Informasi dasar tentang diri Anda."
                  >
                    <input
                      name="full_name"
                      value={profile.full_name || ""}
                      onChange={handleChange}
                      placeholder="Nama Lengkap"
                      className={baseInputStyle}
                    />
                    <input
                      name="nickname"
                      value={profile.nickname || ""}
                      onChange={handleChange}
                      placeholder="Nama Panggilan"
                      className={baseInputStyle}
                    />
                    <input
                      type="date"
                      name="date_of_birth"
                      value={
                        profile.date_of_birth
                          ? profile.date_of_birth.split("T")[0]
                          : ""
                      }
                      onChange={handleChange}
                      className={baseInputStyle}
                    />
                    <select
                      name="gender"
                      value={profile.gender || ""}
                      onChange={handleChange}
                      className={baseInputStyle}
                    >
                      <option value="">Pilih Jenis Kelamin</option>
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                    <input
                      name="domicile"
                      value={profile.domicile || ""}
                      onChange={handleChange}
                      placeholder="Domisili (Kota/Kecamatan)"
                      className={baseInputStyle}
                    />
                    <label
                      htmlFor="profile_picture"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500"
                    >
                      <div className="flex items-center gap-4 px-4 py-2.5 border-2 border-dashed rounded-lg">
                        <Icon
                          path="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M12 15a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
                          className="w-8 h-8 text-gray-400"
                        />
                        <div>
                          <p className="text-sm text-orange-600">
                            Klik untuk mengubah foto profil
                          </p>
                          <p className="text-xs text-gray-500">
                            {profilePictureFile
                              ? profilePictureFile.name
                              : "Pilih foto baru..."}
                          </p>
                        </div>
                      </div>
                      <input
                        id="profile_picture"
                        name="profile_picture"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="sr-only"
                      />
                    </label>
                  </FormSection>

                  <FormSection
                    title="Akademik & Keahlian"
                    description="Latar belakang pendidikan dan keahlian mengajar Anda."
                  >
                    <input
                      name="last_education"
                      value={profile.last_education || ""}
                      onChange={handleChange}
                      placeholder="Pendidikan Terakhir"
                      className={baseInputStyle}
                    />
                    <input
                      name="major"
                      value={profile.major || ""}
                      onChange={handleChange}
                      placeholder="Jurusan / Program Studi"
                      className={baseInputStyle}
                    />
                    <input
                      name="expert_subjects"
                      value={profile.expert_subjects || ""}
                      onChange={handleChange}
                      placeholder="Mapel Keahlian (pisahkan dengan koma)"
                      className={baseInputStyle}
                    />
                    <input
                      name="teachable_levels"
                      value={profile.teachable_levels || ""}
                      onChange={handleChange}
                      placeholder="Jenjang Ajar (pisahkan dengan koma)"
                      className={baseInputStyle}
                    />
                    <textarea
                      name="teaching_experience"
                      value={profile.teaching_experience || ""}
                      onChange={handleChange}
                      placeholder="Pengalaman Mengajar (jelaskan singkat)"
                      className={baseInputStyle}
                      rows="3"
                    ></textarea>
                    <label
                      htmlFor="certificate"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500"
                    >
                      <div className="flex items-center gap-4 px-4 py-2.5 border-2 border-dashed rounded-lg">
                        <Icon
                          path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                          className="w-8 h-8 text-gray-400"
                        />
                        <div>
                          <p className="text-sm text-orange-600">
                            Klik untuk mengunggah sertifikat
                          </p>
                          <p className="text-xs text-gray-500">
                            {certificateFile
                              ? certificateFile.name
                              : "PDF, JPG, PNG (opsional)"}
                          </p>
                        </div>
                      </div>
                      <input
                        id="certificate"
                        name="certificate"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleCertificateChange}
                        className="sr-only"
                      />
                    </label>
                  </FormSection>
                </div>
                <div className="pt-8 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
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
                    {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            ) : activeTab === "history" ? (
              <div>
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      onChange={handleSelectAllHistory}
                      checked={
                        scheduleHistory.length > 0 &&
                        selectedHistoryIds.length === scheduleHistory.length
                      }
                      disabled={scheduleHistory.length === 0}
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
                <div className="space-y-3">
                  {scheduleHistory.length > 0 ? (
                    scheduleHistory.map((session) => (
                      <div
                        key={session.schedule_id}
                        className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                          selectedHistoryIds.includes(session.schedule_id)
                            ? "bg-orange-50 border-orange-200"
                            : "hover:bg-gray-50"
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
                        <div className="flex-grow grid grid-cols-3 items-center gap-4">
                          <p className="font-medium text-gray-800">
                            {session.student_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(
                              new Date(session.session_datetime),
                              "EEEE, dd MMM yyyy",
                              { locale: id }
                            )}
                          </p>
                          <p className="text-sm text-gray-500 capitalize text-right">
                            {session.payroll_status || "Belum Diproses"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="Anda belum memiliki riwayat mengajar." />
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
  );
}
