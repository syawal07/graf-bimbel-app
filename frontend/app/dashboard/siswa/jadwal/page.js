"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// --- [KOMPONEN] Ikon SVG ---
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

// --- [KOMPONEN] Empty State ---
// Tampilan saat tidak ada jadwal
const EmptyState = ({ message, buttonText, buttonLink }) => (
  <div className="text-center p-12 bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50">
    <Icon
      path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
      className="mx-auto h-20 w-20 text-slate-300"
    />
    <p className="mt-5 text-xl font-semibold text-slate-700">{message}</p>
    <p className="mt-2 text-sm text-slate-500">
      Saat Anda memesan sesi baru, jadwalnya akan muncul di sini.
    </p>
    <Link
      href={buttonLink}
      className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-white bg-orange-500 rounded-xl hover:bg-orange-600 font-semibold transition-all shadow-lg hover:shadow-orange-300 text-sm"
    >
      {buttonText}
    </Link>
  </div>
);

// --- [KOMPONEN] Skeleton Loading ---
// Tampilan placeholder saat data dimuat
const ScheduleItemSkeleton = () => (
  <div className="relative pl-14 py-4 animate-pulse">
    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200"></div>
    <div className="absolute left-[13px] top-6 h-4 w-4 rounded-full bg-slate-200"></div>
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
      <div className="flex justify-between items-center">
        <div className="space-y-3">
          <div className="h-5 bg-slate-200 rounded w-48"></div>
          <div className="h-4 bg-slate-200 rounded w-64"></div>
        </div>
        <div className="h-11 bg-slate-200 rounded-lg w-36"></div>
      </div>
    </div>
  </div>
);

// --- [KOMPONEN] Item Jadwal dengan UI Timeline ---
// Kartu untuk setiap sesi dengan desain timeline yang terintegrasi
const ScheduleItem = ({ schedule }) => {
  return (
    <div className="relative pl-14 py-4 group">
      {/* Timeline Elements */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200 group-hover:bg-orange-200 transition-colors"></div>
      <div className="absolute left-[11px] top-6 h-4 w-4 rounded-full bg-white border-2 border-slate-300 group-hover:border-orange-500 group-hover:scale-110 transition-all"></div>
      <p className="absolute left-[-15px] top-[19px] w-12 text-center font-bold text-slate-800 text-sm">
        {format(new Date(schedule.session_datetime), "HH:mm")}
      </p>

      {/* Card Content */}
      <div className="bg-white p-5 rounded-2xl shadow-lg group-hover:shadow-2xl border border-slate-200 group-hover:border-orange-300 transition-all duration-300">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <p className="text-lg font-bold text-slate-800">
              {schedule.mapel || "Sesi Bimbingan"}
            </p>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <Icon
                path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                className="w-4 h-4 text-slate-400"
              />
              Mentor {schedule.mentor_name}
            </p>
          </div>
          <a
            href={schedule.zoom_link || undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => !schedule.zoom_link && e.preventDefault()}
            className={`flex-shrink-0 flex items-center justify-center gap-2 w-full sm:w-auto font-semibold py-2.5 px-5 rounded-xl text-sm transition-all duration-300 shadow-md ${
              schedule.zoom_link
                ? "bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-300"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Icon
              path="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
              className="w-5 h-5"
            />
            {schedule.zoom_link ? "Buka Sesi Belajar" : "Link Belum Ada"}
          </a>
        </div>
      </div>
    </div>
  );
};

// --- [HALAMAN UTAMA] ---
export default function SiswaJadwalLengkapPage() {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const particlesInit = useCallback(
    async (engine) => await loadSlim(engine),
    []
  );

  useEffect(() => {
    const fetchSchedules = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get("/api/student/my-schedules", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sortedSchedules = response.data.sort(
          (a, b) => new Date(a.session_datetime) - new Date(b.session_datetime)
        );
        setSchedules(sortedSchedules);
      } catch (err) {
        toast.error("Gagal memuat daftar jadwal.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, []);

  const upcomingSchedules = schedules.filter(
    (s) => new Date(s.session_datetime) >= new Date()
  );

  const groupedSchedules = upcomingSchedules.reduce((acc, schedule) => {
    const date = format(new Date(schedule.session_datetime), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(schedule);
    return acc;
  }, {});

  return (
    <div className="relative bg-slate-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" autoClose={3000} />
      {/* Header dengan Latar Belakang Gradien & Partikel */}
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-amber-500 to-orange-600">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            particles: {
              number: { value: 30 },
              color: { value: "#ffffff" },
              opacity: { value: 0.3 },
              size: { value: { min: 1, max: 4 } },
              move: { enable: true, speed: 0.5 },
              links: {
                enable: true,
                color: "#ffffff",
                opacity: 0.15,
                distance: 150,
              },
            },
          }}
        />
      </div>

      {/* Konten Utama */}
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/dashboard/siswa"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors text-sm"
            >
              <Icon
                path="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                className="w-5 h-5"
              />
              Kembali ke Dashboard
            </Link>
          </div>
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
              Jadwal Sesi Akan Datang
            </h1>
            <p className="text-white/80 mt-2 text-lg drop-shadow-sm">
              Berikut adalah daftar semua sesi belajar Anda yang telah
              dijadwalkan.
            </p>
          </div>

          <div className="space-y-6">
            {isLoading ? (
              // Tampilkan Skeleton saat loading
              <div className="space-y-2">
                <ScheduleItemSkeleton />
                <ScheduleItemSkeleton />
                <ScheduleItemSkeleton />
              </div>
            ) : Object.keys(groupedSchedules).length > 0 ? (
              // Tampilkan jadwal yang sudah dikelompokkan
              Object.entries(groupedSchedules).map(
                ([date, schedulesOnDate]) => {
                  const parsedDate = parseISO(date);
                  let dateLabel = format(parsedDate, "EEEE, dd MMMM yyyy", {
                    locale: id,
                  });
                  if (isToday(parsedDate)) dateLabel = "Hari Ini";
                  if (isTomorrow(parsedDate)) dateLabel = "Besok";

                  return (
                    <section key={date}>
                      <div className="flex items-center gap-4 py-2 px-4 sticky top-4 bg-slate-100/80 backdrop-blur-sm z-10 rounded-xl">
                        <Icon
                          path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
                          className="w-6 h-6 text-orange-500"
                        />
                        <h2 className="text-xl font-bold text-slate-800">
                          {dateLabel}
                        </h2>
                      </div>
                      <div>
                        {schedulesOnDate.map((schedule) => (
                          <ScheduleItem
                            key={schedule.schedule_id}
                            schedule={schedule}
                          />
                        ))}
                      </div>
                    </section>
                  );
                }
              )
            ) : (
              // Tampilkan Empty State jika tidak ada jadwal
              <EmptyState
                message="Anda belum memiliki jadwal sesi."
                buttonText="Kembali ke Dashboard"
                buttonLink="/dashboard/siswa"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
