"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// Opsi untuk Partikel Latar Belakang
const particlesOptions = {
  fullScreen: { enable: false },
  background: { color: { value: "transparent" } },
  fpsLimit: 120,
  particles: {
    number: { value: 30, density: { enable: true, area: 800 } },
    color: { value: "#ffffff" },
    shape: { type: "circle" },
    opacity: { value: 0.2 },
    size: { value: { min: 1, max: 3 } },
    links: {
      color: "#ffffff",
      distance: 150,
      enable: true,
      opacity: 0.1,
      width: 1,
    },
    move: {
      enable: true,
      speed: 0.5,
      direction: "none",
      outModes: { default: "bounce" },
    },
  },
  detectRetina: true,
};

// Komponen Ikon
const Icon = ({ path, className = "w-6 h-6" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path}></path>
  </svg>
);

// [DIROMBAK] Komponen Kartu Jadwal Berikutnya
const NextScheduleCard = ({ schedule }) => {
  if (!schedule) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-xl text-center border border-slate-200/50">
        <Icon
          path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
          className="w-16 h-16 mx-auto text-slate-300 mb-4"
        />
        <h3 className="font-bold text-slate-800 text-xl">
          Belum Ada Jadwal Berikutnya
        </h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Jadwal sesi bimbinganmu akan muncul di sini setelah diatur oleh
          mentor.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl border-l-8 border-orange-500">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex-grow">
          <p className="text-sm font-semibold text-orange-600 mb-1">
            JADWAL BERIKUTNYA
          </p>
          <p className="font-bold text-slate-800 text-xl flex items-center gap-2">
            <Icon
              path="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              className="w-5 h-5 text-slate-400"
            />
            Sesi dengan Mentor {schedule.mentor_name}
          </p>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Icon
                path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
                className="w-4 h-4 text-slate-400"
              />
              {format(
                new Date(schedule.session_datetime),
                "EEEE, dd MMMM yyyy",
                { locale: id }
              )}
            </p>
            <p className="flex items-center gap-2">
              <Icon
                path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                className="w-4 h-4 text-slate-400"
              />
              Pukul{" "}
              {format(new Date(schedule.session_datetime), "HH:mm", {
                locale: id,
              })}{" "}
              WIB
            </p>
          </div>
        </div>
        <a
          href={schedule.zoom_link || undefined}
          onClick={(e) => !schedule.zoom_link && e.preventDefault()}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 sm:mt-0 flex-shrink-0 inline-flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-md ${
            schedule.zoom_link
              ? "bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-300"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Icon
            path="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z"
            className="w-5 h-5"
          />
          {schedule.zoom_link ? "Buka Link Sesi" : "Link Belum Ada"}
        </a>
      </div>
    </div>
  );
};

// [DIUPGRADE] Komponen Kartu Paket
const PackageCard = ({ pkg }) => {
  const sessionsDone = pkg.used_sessions ?? 0;
  const progressPercentage =
    pkg.total_sessions > 0 ? (sessionsDone / pkg.total_sessions) * 100 : 0;

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col justify-between h-full border border-slate-200/50">
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">
          {pkg.package_name}
        </h3>
        <p className="text-sm text-slate-500">Paket Bimbingan Belajar</p>

        {pkg.status === "active" ? (
          <>
            <div className="my-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-slate-700">
                  Progress Sesi
                </span>
                <span className="font-bold text-orange-600">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3.5">
                <div
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-3.5 rounded-full transition-all"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="text-sm space-y-1 text-slate-600">
              <p>
                <strong>{sessionsDone}</strong> dari{" "}
                <strong>{pkg.total_sessions}</strong> Sesi Selesai
              </p>
              <p>
                Sisa Sesi: <strong>{pkg.remaining_sessions}</strong>
              </p>
            </div>
          </>
        ) : (
          <div className="text-center my-6">
            <span className="px-4 py-2 bg-amber-100 text-amber-800 font-bold text-sm rounded-full">
              Menunggu Verifikasi
            </span>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-6 text-center">
        Jadwal akan diatur dan diinformasikan oleh mentormu.
      </p>
    </div>
  );
};

// [BARU] Komponen Kartu Aksi/Navigasi
const ActionLinkCard = ({ href, iconPath, title, description }) => (
  <Link href={href}>
    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200/50 h-full group hover:shadow-2xl hover:-translate-y-1 transition-all">
      <div className="bg-orange-100 text-orange-600 rounded-2xl w-14 h-14 flex items-center justify-center">
        <Icon path={iconPath} className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mt-4">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 mb-4">{description}</p>
      <p className="font-semibold text-orange-600 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
        Lihat Sekarang{" "}
        <Icon
          path="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
          className="w-4 h-4"
        />
      </p>
    </div>
  </Link>
);

// Komponen Loading Skeleton
const LoadingSkeleton = () => (
  <div className="relative z-10 p-4 sm:p-6 lg:p-8 animate-pulse">
    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-10 gap-4">
      <div>
        <div className="h-9 bg-white/30 rounded-lg w-64"></div>
        <div className="h-5 bg-white/20 rounded-lg w-48 mt-3"></div>
      </div>
      <div className="h-12 bg-white/80 rounded-xl w-44"></div>
    </div>
    <div className="h-40 bg-white/80 rounded-3xl mb-10"></div>
    <div className="h-7 bg-slate-300 rounded-lg w-40 mb-5"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="h-60 bg-white rounded-3xl"></div>
      <div className="h-60 bg-white rounded-3xl"></div>
    </div>
  </div>
);

export default function SiswaDashboardPage() {
  const [activePackages, setActivePackages] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const particlesInit = useCallback(
    async (engine) => await loadSlim(engine),
    []
  );

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const packagesPromise = axios.get("/api/student/my-packages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const schedulesPromise = axios.get("/api/student/my-schedules", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userPromise = axios.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const [packagesRes, schedulesRes, userRes] = await Promise.all([
        packagesPromise,
        schedulesPromise,
        userPromise,
      ]);
      const activeOrPendingPackages = packagesRes.data.filter(
        (pkg) => pkg.status === "active" || pkg.status === "pending"
      );

      setActivePackages(activeOrPendingPackages);
      setSchedules(schedulesRes.data);
      setUser(userRes.data);
    } catch (err) {
      toast.error("Gagal memuat data dashboard. Coba muat ulang halaman.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const upcomingSchedules = schedules
    .filter((s) => new Date(s.session_datetime) >= new Date())
    .sort(
      (a, b) => new Date(a.session_datetime) - new Date(b.session_datetime)
    );

  return (
    <div className="relative bg-slate-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" autoClose={3000} />
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-amber-500 to-orange-600">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesOptions}
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-10 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
                Dashboard Siswa
              </h1>
              <p className="text-white/80 mt-2 text-lg drop-shadow-sm">
                Selamat datang kembali, {user?.full_name || ""}! 👋
              </p>
            </div>
            <Link
              href="/dashboard/siswa/packages"
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-orange-600 bg-white rounded-xl shadow-lg hover:bg-slate-100 transition-all hover:-translate-y-0.5"
            >
              <Icon
                path="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25V7.5"
                className="w-5 h-5"
              />
              Beli Paket Baru
            </Link>
          </div>

          <div className="mb-10">
            <NextScheduleCard schedule={upcomingSchedules[0]} />
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-5 text-slate-800">
              Paket Saya
            </h2>
            {activePackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activePackages.map((pkg) => (
                  <PackageCard key={pkg.user_package_id} pkg={pkg} />
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-slate-500 bg-white rounded-3xl shadow-xl border border-slate-200/50">
                <p className="font-semibold">
                  Anda belum memiliki paket bimbel yang aktif.
                </p>
                <p className="text-sm mt-1">
                  Silakan beli paket baru untuk memulai sesi bimbingan.
                </p>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-5 text-slate-800">
              Pusat Aksi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ActionLinkCard
                href="/dashboard/siswa/jadwal"
                iconPath="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
                title="Jadwal Lengkap"
                description="Lihat semua jadwal sesi bimbingan yang akan datang."
              />
              <ActionLinkCard
                href="/dashboard/siswa/history"
                iconPath="M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                title="Riwayat & Laporan"
                description="Akses kembali laporan dan materi dari sesi yang telah selesai."
              />
              <ActionLinkCard
                href="/dashboard/siswa/package-history"
                iconPath="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18m-3-12v.75m0 3v.75m0 3v.75m0 3V18m9-12v.75m0 3v.75m0 3v.75m0 3V18m-6-12v.75m0 3v.75m0 3v.75m0 3V18m-3-12v.75m0 3v.75m0 3v.75m0 3V18"
                title="Riwayat Paket"
                description="Tinjau semua paket bimbingan yang pernah Anda beli."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
