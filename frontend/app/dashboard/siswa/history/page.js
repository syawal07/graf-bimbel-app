"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useDebounce } from "use-debounce";

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
const EmptyState = ({ message, buttonText, buttonLink }) => (
  <div className="text-center p-10 bg-white rounded-2xl shadow-lg">
    <Icon
      path="M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      className="mx-auto h-16 w-16 text-gray-300"
    />
    <p className="mt-4 font-semibold text-gray-700">{message}</p>
    <p className="mt-1 text-sm text-gray-500">
      Semua sesi yang telah selesai akan muncul di sini.
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

const SessionStatusBadge = ({ status }) => {
  const styles = {
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    scheduled: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status === "completed" ? "Selesai" : status}
    </span>
  );
};

const TableSkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-4">
      <div className="h-4 w-4 bg-gray-200 rounded"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
  </tr>
);

export default function SessionHistoryPage() {
  const [sessionData, setSessionData] = useState({
    schedules: [],
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [selectedSchedules, setSelectedSchedules] = useState([]);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get("/api/student/my-session-history", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: currentPage, search: debouncedSearchTerm, limit: 10 },
      });
      setSessionData({
        schedules: response.data.schedules || [],
        totalPages: response.data.totalPages || 1,
      });
    } catch (err) {
      toast.error("Gagal memuat riwayat sesi.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const handleBulkHide = async () => {
    if (selectedSchedules.length === 0) {
      toast.warn("Pilih setidaknya satu sesi untuk disembunyikan.");
      return;
    }
    if (
      !confirm(
        `Yakin ingin menyembunyikan ${selectedSchedules.length} sesi terpilih dari riwayat Anda?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    try {
      await axios.put(
        "/api/student/my-schedules/hide-bulk",
        { scheduleIds: selectedSchedules },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${selectedSchedules.length} sesi berhasil disembunyikan.`);
      setSelectedSchedules([]);
      fetchHistory();
    } catch (err) {
      toast.error("Gagal menyembunyikan sesi.");
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSchedules(sessionData.schedules.map((s) => s.schedule_id));
    } else {
      setSelectedSchedules([]);
    }
  };
  const handleSelectOne = (e, scheduleId) => {
    if (e.target.checked) {
      setSelectedSchedules((prev) => [...prev, scheduleId]);
    } else {
      setSelectedSchedules((prev) => prev.filter((id) => id !== scheduleId));
    }
  };

  const handleDownloadExcel = () => {
    const dataToExport = sessionData.schedules.map((s) => ({
      "Tanggal Sesi": format(
        new Date(s.session_datetime),
        "dd MMMM yyyy, HH:mm",
        { locale: id }
      ),
      Mentor: s.mentor_name,
      "Mata Pelajaran": s.mapel,
      "Rangkuman Materi": s.summary,
      "Jurnal Perkembangan": s.student_development_journal,
      Status: s.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Sesi");
    XLSX.writeFile(workbook, "Riwayat_Sesi_Bimbel.xlsx");
    toast.success("Mengunduh file Excel...");
  };

  const { schedules, totalPages } = sessionData;

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
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link
              href="/dashboard/siswa"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors text-sm"
            >
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />{" "}
              Kembali ke Dashboard
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Data Laporan & Riwayat
              </h1>
              <p className="text-white/80 mt-1">
                Lihat semua riwayat sesi dan unduh laporannya.
              </p>
            </div>
            <button
              onClick={handleDownloadExcel}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-semibold shadow-sm"
            >
              <Icon
                path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                className="w-5 h-5"
              />{" "}
              Unduh Excel
            </button>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
              <div className="relative w-full sm:w-1/2 lg:w-1/3">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icon
                    path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    className="h-5 w-5 text-gray-400"
                  />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari mentor, mapel, atau materi..."
                  className="w-full rounded-md border-gray-300 shadow-sm pl-10 placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-4 py-2"
                />
              </div>
              {selectedSchedules.length > 0 && (
                <button
                  onClick={handleBulkHide}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  <Icon
                    path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    className="w-4 h-4"
                  />{" "}
                  Hapus ({selectedSchedules.length}) Sesi
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-4">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          schedules.length > 0 &&
                          selectedSchedules.length === schedules.length
                        }
                        className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mentor & Mapel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Materi Diajarkan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lampiran
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableSkeletonRow key={i} />
                    ))
                  ) : schedules.length > 0 ? (
                    schedules.map((session) => (
                      <tr
                        key={session.schedule_id}
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedSchedules.includes(session.schedule_id)
                            ? "bg-orange-50"
                            : ""
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedSchedules.includes(
                              session.schedule_id
                            )}
                            onChange={(e) =>
                              handleSelectOne(e, session.schedule_id)
                            }
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {format(
                            new Date(session.session_datetime),
                            "dd MMM yyyy, HH:mm",
                            { locale: id }
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <p className="font-semibold text-gray-900">
                            {session.mentor_name}
                          </p>
                          <p className="text-gray-500">{session.mapel}</p>
                        </td>
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate"
                          title={session.summary}
                        >
                          {session.summary || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <SessionStatusBadge status={session.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {session.material_url ? (
                            <a
                              href={`http://localhost:5000/${session.material_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-orange-600 hover:underline"
                            >
                              Unduh
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">
                        <EmptyState
                          message="Tidak ada riwayat sesi ditemukan."
                          buttonText="Kembali ke Dashboard"
                          buttonLink="/dashboard/siswa"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && !isLoading && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage >= totalPages || totalPages === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
