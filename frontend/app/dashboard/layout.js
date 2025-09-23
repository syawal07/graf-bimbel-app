"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Image from "next/image";

//=================================================================
// HELPER & KOMPONEN UI
//=================================================================

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

const LoadingScreen = () => (
  <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50">
    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-slate-600 mt-4">Memuat sesi Anda...</p>
  </div>
);

const AccessDenied = () => (
  <div className="flex flex-col justify-center items-center min-h-screen text-center p-4 bg-slate-50">
    <Icon
      path="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      className="w-12 h-12 text-slate-400 mb-4"
    />
    <h1 className="text-xl font-bold text-slate-800">Akses Ditolak</h1>
    <p className="text-slate-600">
      Anda harus login untuk dapat mengakses halaman ini.
    </p>
    <a
      href="/login"
      className="mt-6 px-5 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-colors"
    >
      Ke Halaman Login
    </a>
  </div>
);

const DashboardNavbar = ({ unreadCount, logoUrl }) => {
  // ✅ PERBAIKAN: Normalisasi path logo untuk mencegah error `//`
  const finalLogoUrl = logoUrl
    ? `/${logoUrl.replace(/^\/*/, "")}`
    : "/assets/img/hero/10.jpg";

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <a href="/dashboard">
              <Image
                src={finalLogoUrl}
                alt="Logo Graf Bimbel"
                width={140}
                height={40}
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://placehold.co/140x40/ffffff/F97316?text=Graf+Bimbel&font=raleway";
                }}
                priority
              />
            </a>
          </div>
          <div className="flex items-center">
            <a
              href="/dashboard/notifikasi"
              className="relative p-2 rounded-full text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
            >
              <Icon
                path="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                className="w-6 h-6"
              />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-orange-500 text-white text-xs font-semibold items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

//=================================================================
// CUSTOM HOOK UNTUK LOGIKA DATA & OTENTIKASI
//=================================================================

const useDashboardData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [logoUrl, setLogoUrl] = useState("/assets/img/hero/10.jpg"); // Logo default
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    setIsAuthenticated(true);
    setUserRole(role);

    const fetchInitialData = async () => {
      try {
        const settingsPromise = axios.get("/api/public/settings");

        let announcementsPromise = Promise.resolve({ data: [] });
        if (role === "siswa" || role === "mentor") {
          const apiRole = role === "siswa" ? "student" : role;
          announcementsPromise = axios.get(`/api/${apiRole}/announcements`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        const [settingsRes, announcementsRes] = await Promise.all([
          settingsPromise,
          announcementsPromise,
        ]);

        if (settingsRes.data?.logo_url) {
          setLogoUrl(settingsRes.data.logo_url);
        }

        const count = announcementsRes.data.filter(
          (ann) => !ann.is_read
        ).length;
        setUnreadCount(count);
      } catch (error) {
        console.warn("Gagal mengambil data awal dashboard:", error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  return { isLoading, isAuthenticated, unreadCount, logoUrl, userRole };
};

//=================================================================
// KOMPONEN UTAMA LAYOUT
//=================================================================

export default function DashboardLayout({ children }) {
  const { isLoading, isAuthenticated, unreadCount, logoUrl, userRole } =
    useDashboardData();

  // Efek terpisah untuk mendaftarkan Service Worker setelah otentikasi berhasil
  useEffect(() => {
    if (
      isAuthenticated &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    ) {
      const registerServiceWorker = async () => {
        try {
          await navigator.serviceWorker.register("/sw.js");
          // console.log("Service Worker terdaftar.");
          // Logika untuk subscribe ke push notification bisa ditambahkan di sini
        } catch (error) {
          console.error("Gagal mendaftarkan Service Worker:", error);
        }
      };
      registerServiceWorker();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AccessDenied />;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <DashboardNavbar unreadCount={unreadCount} logoUrl={logoUrl} />
      <main>{children}</main>
    </div>
  );
}
