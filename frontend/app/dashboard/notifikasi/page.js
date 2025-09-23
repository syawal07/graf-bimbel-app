"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { format, formatDistanceToNowStrict } from "date-fns";
import { id } from "date-fns/locale";

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

// Komponen UI Tambahan
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="bg-white p-4 rounded-lg shadow-sm animate-pulse">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
          <div className="flex-grow">
            <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="text-center p-10 bg-white rounded-2xl shadow-lg">
    <Icon
      path="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.82-2.48l-6.478-3.488m0 0a3.004 3.004 0 00-3.706 0M2.25 9l6.478 3.488"
      className="mx-auto h-16 w-16 text-gray-300"
    />
    <p className="mt-4 font-semibold text-gray-700">Tidak Ada Pengumuman</p>
    <p className="mt-1 text-sm text-gray-500">
      Saat ini belum ada pengumuman baru untuk Anda.
    </p>
  </div>
);

export default function NotifikasiPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getApiEndpoint = () => {
    let role = localStorage.getItem("role");
    // --- PERBAIKAN LOGIKA DI SINI ---
    // Jika role adalah 'siswa', kita gunakan 'student' untuk endpoint API.
    if (role === "siswa") {
      role = "student";
    }
    return role;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Gagal mengautentikasi pengguna.");
      setIsLoading(false);
      return;
    }

    const apiRole = getApiEndpoint();
    if (!apiRole) {
      setIsLoading(false);
      return;
    }
    const endpoint = `/api/${apiRole}/announcements`;

    try {
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(response.data);
    } catch (err) {
      toast.error("Gagal memuat pengumuman.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkAsRead = async (announcementId, isRead) => {
    if (isRead) return;

    const token = localStorage.getItem("token");
    const apiRole = getApiEndpoint();
    if (!apiRole) return;

    const endpoint = `/api/${apiRole}/announcements/${announcementId}/read`;

    try {
      setAnnouncements((prev) =>
        prev.map((ann) =>
          ann.announcement_id === announcementId
            ? { ...ann, is_read: true }
            : ann
        )
      );
      await axios.put(
        endpoint,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      toast.error("Gagal menandai notifikasi.");
      setAnnouncements((prev) =>
        prev.map((ann) =>
          ann.announcement_id === announcementId
            ? { ...ann, is_read: false }
            : ann
        )
      );
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Menggunakan style tag untuk CSS react-toastify */}
      <style>{`
        .Toastify__toast-container { z-index: 9999; position: fixed; padding: 4px; width: 320px; box-sizing: border-box; color: #fff; }
        .Toastify__toast-container--top-center { top: 1em; left: 50%; transform: translateX(-50%); }
        .Toastify__toast { position: relative; min-height: 64px; box-sizing: border-box; margin-bottom: 1rem; padding: 8px; border-radius: 4px; box-shadow: 0 1px 10px 0 rgba(0, 0, 0, 0.1), 0 2px 15px 0 rgba(0, 0, 0, 0.05); display: flex; justify-content: space-between; max-height: 800px; overflow: hidden; font-family: sans-serif; cursor: pointer; direction: ltr; }
        .Toastify__toast--colored.Toastify__toast--error { color: #fff; background: #e74c3c; }
        .Toastify__toast-body { margin: auto 0; flex: 1 1 auto; padding: 6px; }
      `}</style>
      <ToastContainer position="top-center" theme="colored" />
      <div className="relative">
        <div className="absolute top-0 left-0 w-full h-56 bg-gradient-to-r from-yellow-400 to-orange-500" />
        <main className="relative p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Pusat Pengumuman
              </h1>
              <p className="text-white/80 mt-1">
                Semua informasi dan pengumuman penting ada di sini.
              </p>
            </div>
            <a
              href="/dashboard"
              className="hidden sm:flex items-center gap-2 text-white/80 hover:text-white font-semibold text-sm"
            >
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
              Kembali ke Dashboard
            </a>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : announcements.length > 0 ? (
              announcements.map((ann) => (
                <div
                  key={ann.announcement_id}
                  onClick={() =>
                    handleMarkAsRead(ann.announcement_id, ann.is_read)
                  }
                  className={`bg-white p-4 rounded-lg shadow-sm transition-all duration-300 cursor-pointer ${
                    !ann.is_read
                      ? "border-l-4 border-orange-500 hover:shadow-md"
                      : "opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!ann.is_read && (
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    )}
                    <div
                      className={`flex-grow ${ann.is_read ? "ml-[22px]" : ""}`}
                    >
                      <div className="flex justify-between items-center">
                        <h3
                          className={`font-bold text-gray-800 ${
                            !ann.is_read ? "text-lg" : "text-base"
                          }`}
                        >
                          {ann.title}
                        </h3>
                        <p className="text-xs text-gray-500 flex-shrink-0 ml-4">
                          {formatDistanceToNowStrict(new Date(ann.created_at), {
                            addSuffix: true,
                            locale: id,
                          })}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {ann.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
