"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import { useSpring, animated } from "@react-spring/web";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// Helper function untuk memastikan path media selalu benar
const getSafeImagePath = (path) => {
  if (!path) return "/assets/img/hero/10.jpg"; // Fallback jika path kosong
  if (path.startsWith("blob:")) return path;
  return `/${path.replace(/^\/+/, "")}`;
};

// Opsi untuk Partikel Latar Belakang
const particlesOptions = {
  fpsLimit: 120,
  interactivity: {
    events: {
      onHover: { enable: true, mode: "repulse" },
      resize: true,
    },
    modes: {
      repulse: { distance: 80, duration: 0.4 },
    },
  },
  particles: {
    color: { value: "#ffffff" },
    links: {
      color: "#ffffff",
      distance: 150,
      enable: true,
      opacity: 0.2,
      width: 1,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: { default: "bounce" },
      random: false,
      speed: 2,
      straight: false,
    },
    number: {
      density: { enable: true, area: 800 },
      value: 80,
    },
    opacity: { value: 0.2 },
    shape: { type: "circle" },
    size: { value: { min: 1, max: 3 } },
  },
  detectRetina: true,
};

// Komponen Ikon
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

// Komponen Kartu Ringkasan dengan Animasi
const SummaryCard = ({ title, value, colorClass, iconPath, iconBgClass }) => {
  const props = useSpring({
    from: { number: 0 },
    to: { number: value || 0 },
    config: { duration: 1000 },
  });

  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-lg flex items-center gap-4 border-l-4 ${colorClass}`}
    >
      <div
        className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full ${iconBgClass}`}
      >
        <Icon
          path={iconPath}
          className={`w-6 h-6 ${colorClass.replace("border-", "text-")}`}
        />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <animated.div className="text-3xl font-bold text-gray-800">
          {props.number.to((n) => n.toFixed(0))}
        </animated.div>
      </div>
    </div>
  );
};

// Komponen Skeleton untuk Loading
const SummaryCardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center gap-4 animate-pulse">
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-200"></div>
    <div className="w-full">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-8 bg-gray-300 rounded w-1/4"></div>
    </div>
  </div>
);

// Komponen Tombol Menu
const MenuButton = ({ href, title, iconPath }) => (
  <Link
    href={href}
    className="group bg-gray-50 hover:bg-white border border-gray-200 p-6 rounded-xl text-center font-semibold text-gray-700 transition-all duration-300 flex flex-col items-center justify-center transform hover:-translate-y-1 hover:shadow-xl"
  >
    <div className="bg-orange-100 group-hover:bg-orange-500 rounded-full p-3 transition-colors duration-300">
      <Icon
        path={iconPath}
        className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors duration-300"
      />
    </div>
    <span className="mt-3 text-sm">{title}</span>
  </Link>
);

export default function AdminDashboardPage() {
  const [summaryData, setSummaryData] = useState({});
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState("/assets/img/hero/10.jpg");

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    const fetchAdminData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const summaryPromise = axios.get("/api/admin/dashboard-summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userPromise = axios.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const settingsPromise = axios.get("/api/public/settings");

        const [summaryRes, userRes, settingsRes] = await Promise.all([
          summaryPromise,
          userPromise,
          settingsPromise,
        ]);
        setSummaryData(summaryRes.data);
        setUser(userRes.data);
        if (settingsRes.data && settingsRes.data.logo_url) {
          setLogoUrl(getSafeImagePath(settingsRes.data.logo_url));
        }
      } catch (error) {
        console.error("Gagal memuat data dasbor:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  return (
    <div className="relative bg-gray-50 min-h-screen">
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-r from-yellow-400 to-orange-500">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesOptions}
        />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard Admin</h1>
            <p className="text-white/80 mt-1">
              Selamat datang kembali, {user?.full_name || "Admin"}!
            </p>
          </div>
          {/* [DIPERBAIKI] Logo sekarang tidak memiliki background */}
          <Image
            src={logoUrl}
            alt="Logo Graf Bimbel"
            width={80}
            height={80}
            className="rounded-lg object-contain"
            priority
            onError={(e) => {
              e.currentTarget.src = "/assets/img/hero/10.jpg";
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {isLoading ? (
            <>
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </>
          ) : (
            <>
              {/* [DIPERBAIKI] Menambahkan fallback value `|| 0` untuk memastikan kartu selalu render */}
              <SummaryCard
                title="Siswa Aktif"
                value={summaryData?.activeStudents || 0}
                colorClass="border-blue-500"
                iconBgClass="bg-blue-100"
                iconPath="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 12.75a3 3 0 110-6 3 3 0 010 6z"
              />
              <SummaryCard
                title="Mentor Aktif"
                value={summaryData?.activeMentors || 0}
                colorClass="border-green-500"
                iconBgClass="bg-green-100"
                iconPath="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
              <SummaryCard
                title="Pembayaran Tertunda"
                value={summaryData?.pendingPayments || 0}
                colorClass="border-yellow-600"
                iconBgClass="bg-yellow-200"
                iconPath="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <SummaryCard
                title="Sesi Hari Ini"
                value={summaryData?.upcomingSessions || 0}
                colorClass="border-indigo-600"
                iconBgClass="bg-indigo-200"
                iconPath="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
              />
            </>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Menu Manajemen
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MenuButton
              href="/dashboard/admin/users"
              title="Manajemen Pengguna"
              iconPath="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-1a6 6 0 00-1.781-4.121M12 10a4 4 0 11-8 0 4 4 0 018 0z"
            />
            <MenuButton
              href="/dashboard/admin/packages"
              title="Paket Bimbel"
              iconPath="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
            <MenuButton
              href="/dashboard/admin/payments"
              title="Verifikasi Pembayaran"
              iconPath="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
            <MenuButton
              href="/dashboard/admin/schedules"
              title="Semua Jadwal"
              iconPath="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
            <MenuButton
              href="/dashboard/admin/reports"
              title="Verifikasi Laporan"
              iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
            <MenuButton
              href="/dashboard/admin/payroll"
              title="Gaji Mentor"
              iconPath="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
            <MenuButton
              href="/dashboard/admin/schedule-view"
              title="Kalender Global"
              iconPath="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.737 11a2 2 0 012.263 0m7-2.263a2 2 0 00-2.263 0M12 17.75V21M3 3h18M3 7h18"
            />
            <MenuButton
              href="/dashboard/admin/content"
              title="Manajemen Konten"
              iconPath="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
