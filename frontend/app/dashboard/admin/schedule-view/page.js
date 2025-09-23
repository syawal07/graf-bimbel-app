"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  isWithinInterval,
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isToday,
  addDays,
} from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import dynamic from "next/dynamic";

// Memuat Particles secara dinamis hanya di client side
const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });
import { loadSlim } from "tsparticles-slim";

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

// --- Komponen Skeleton Loading untuk Tabel ---
const ScheduleTableSkeleton = ({ timeSlots, days }) => (
  <table className="w-full border-collapse text-sm text-center">
    <thead>
      <tr className="bg-slate-100">
        <th className="p-3 border-b-2 border-slate-200 sticky left-0 bg-slate-100 z-20 font-semibold text-slate-700 w-[100px]">
          Waktu
        </th>
        {days.map((day) => (
          <th
            key={day}
            className="p-3 border-b-2 border-slate-200 font-semibold text-slate-700 min-w-[150px]"
          >
            {day}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {timeSlots.map((time) => (
        <tr key={time} className="hover:bg-slate-50/50">
          <td className="p-3 border-b border-slate-200 font-semibold bg-slate-50 sticky left-0 z-10 w-[100px] text-slate-600">
            {time}
          </td>
          {days.map((_, dayIndex) => (
            <td
              key={`${dayIndex}-${time}`}
              className="p-2 border-b border-slate-200 align-top"
            >
              <div className="animate-pulse bg-slate-200 rounded-lg w-full h-16"></div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

export default function ScheduleViewPage() {
  const [allSchedules, setAllSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const timeSlots = Array.from(
    { length: 15 },
    (_, i) => `${String(i + 7).padStart(2, "0")}:00`
  );

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const fetchSchedules = useCallback(async (start, end) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Anda harus login untuk melihat jadwal.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get("/api/admin/schedules", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
        },
      });
      setAllSchedules(response.data);
    } catch (err) {
      console.error("Error fetching schedules:", err);
      setError("Gagal memuat data jadwal. Silakan coba lagi nanti.");
      toast.error("Gagal memuat data jadwal.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    fetchSchedules(start, end);
  }, [currentDate, fetchSchedules]);

  // --- PERUBAHAN 1: Menggunakan .filter() untuk mendapatkan SEMUA jadwal ---
  const getSchedulesForSlot = (dayIndex, time) => {
    const targetHour = parseInt(time.split(":")[0]);
    // Menggunakan .filter() bukan .find()
    return allSchedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.session_datetime);
      const scheduleDay = (scheduleDate.getDay() + 6) % 7;
      return scheduleDay === dayIndex && scheduleDate.getHours() === targetHour;
    });
  };

  const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-8">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <p className="text-red-600 font-semibold text-lg">{error}</p>
          <Link
            href="/dashboard/admin"
            className="mt-6 inline-block bg-orange-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );

  const startOfWeekDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endOfWeekDate = endOfWeek(currentDate, { weekStartsOn: 1 });
  const formattedWeek = `${format(startOfWeekDate, "d MMM", {
    locale: id,
  })} - ${format(endOfWeekDate, "d MMM yyyy", { locale: id })}`;

  return (
    <div className="relative bg-slate-100 min-h-screen font-sans">
      <ToastContainer position="top-center" theme="colored" autoClose={3000} />
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-r from-yellow-500 to-orange-600">
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

      <main className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-full mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
              Jadwal Global
            </h1>
            <p className="text-white/80 mt-1 text-lg">
              Tampilan kalender mingguan untuk semua sesi.
            </p>
          </div>
          <Link
            href="/dashboard/admin"
            className="hidden sm:inline-flex items-center gap-2 text-white/90 hover:text-white font-semibold text-sm transition-colors"
          >
            <Icon
              path="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              className="w-5 h-5"
            />
            Kembali ke Dashboard
          </Link>
        </header>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-2xl">
          <div className="flex justify-between items-center mb-6 px-2">
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-full text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors shadow-sm"
              title="Minggu Sebelumnya"
            >
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-6 h-6" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 text-center">
              {formattedWeek}
            </h2>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-full text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors shadow-sm"
              title="Minggu Selanjutnya"
            >
              <Icon path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            {isLoading ? (
              <ScheduleTableSkeleton timeSlots={timeSlots} days={days} />
            ) : (
              <table className="w-full border-collapse text-sm text-center">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-3 border-b-2 border-slate-200 sticky left-0 bg-slate-100 z-20 font-semibold text-slate-700 w-[100px]">
                      Waktu
                    </th>
                    {days.map((day, index) => {
                      const dayDate = addDays(startOfWeekDate, index);
                      const isCurrentDay = isToday(dayDate);
                      return (
                        <th
                          key={day}
                          className={`p-3 border-b-2 border-slate-200 font-semibold min-w-[160px] ${
                            isCurrentDay
                              ? "bg-orange-100 text-orange-700"
                              : "text-slate-700"
                          }`}
                        >
                          {day}
                          <div
                            className={`text-xs font-bold mt-1 ${
                              isCurrentDay
                                ? "text-orange-600"
                                : "text-slate-500"
                            }`}
                          >
                            {format(dayDate, "d")}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((time) => (
                    <tr key={time} className="hover:bg-slate-50/50">
                      <td className="p-3 border-b border-slate-200 font-semibold bg-slate-50 sticky left-0 z-10 w-[100px] text-slate-600">
                        {time}
                      </td>
                      {days.map((_, dayIndex) => {
                        // --- PERUBAHAN 2: Panggil fungsi yang sudah diubah ---
                        const schedulesInSlot = getSchedulesForSlot(
                          dayIndex,
                          time
                        );
                        const dayDate = addDays(startOfWeekDate, dayIndex);
                        return (
                          <td
                            key={`${dayIndex}-${time}`}
                            className={`p-2 border-b border-slate-200 align-top ${
                              isToday(dayDate) ? "bg-slate-50" : ""
                            }`}
                          >
                            {/* --- PERUBAHAN 3: Tampilkan semua jadwal dalam satu sel --- */}
                            {schedulesInSlot.length > 0 && (
                              <div className="space-y-2">
                                {schedulesInSlot.map((schedule) => (
                                  <div
                                    key={schedule.schedule_id}
                                    className="text-xs text-left bg-orange-50 border-l-4 border-orange-400 p-2 rounded-md shadow-sm hover:shadow-md transition-shadow duration-300"
                                  >
                                    <p className="font-bold text-orange-900 truncate">
                                      {schedule.student_name}
                                    </p>
                                    <p className="text-slate-600 truncate">
                                      Mentor: {schedule.mentor_name}
                                    </p>
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-200 text-orange-800">
                                      {schedule.package_name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && allSchedules.length === 0 && (
              <div className="text-center py-16 px-6">
                <Icon
                  path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  className="mx-auto h-16 w-16 text-slate-300"
                />
                <p className="mt-4 text-lg font-semibold text-slate-700">
                  Tidak ada jadwal untuk pekan ini.
                </p>
                <p className="text-sm text-slate-500">
                  Coba navigasi ke minggu lain atau buat jadwal baru.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
