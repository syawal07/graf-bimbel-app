"use client";

// --- Imports Eksternal ---
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useDebounce } from "use-debounce";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

registerLocale("id", id);
const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// --- Konfigurasi dan Opsi ---
const particlesOptions = {
  background: { color: { value: "transparent" } },
  fpsLimit: 60,
  interactivity: {
    events: { onHover: { enable: true, mode: "grab" }, resize: true },
    modes: { grab: { distance: 140, links: { opacity: 1 } } },
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
    move: { enable: true, speed: 1 },
    number: { density: { enable: true, area: 800 }, value: 40 },
    opacity: { value: 0.3 },
  },
};

// --- Komponen-Komponen UI Kecil (Pembantu) ---
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

const EmptyState = ({ message }) => (
  <div className="text-center p-10">
    <Icon
      path="M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      className="mx-auto h-16 w-16 text-gray-300"
    />
    <p className="mt-4 font-semibold text-gray-600">{message}</p>
    <p className="mt-1 text-sm text-gray-500">
      Gunakan tombol Buat Jadwal untuk menambahkan sesi baru.
    </p>
  </div>
);

const TableSkeletonRow = ({ columns }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </td>
    ))}
  </tr>
);

// --- Komponen Modal Edit Jadwal ---
const EditScheduleModal = ({ schedule, onClose, onScheduleUpdated }) => {
  const [sessionDatetime, setSessionDatetime] = useState(
    new Date(schedule.session_datetime)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `/api/mentor/my-schedules/${schedule.schedule_id}`,
        { session_datetime: sessionDatetime },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Jadwal berhasil diperbarui!");
      onScheduleUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memperbarui jadwal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit Waktu Sesi</h2>
            <p className="text-sm text-gray-500 mt-1">
              Siswa:{" "}
              <span className="font-semibold text-orange-600">
                {schedule.student_name}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="datetime"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tanggal & Waktu Baru
            </label>
            <DatePicker
              selected={sessionDatetime}
              onChange={(date) => setSessionDatetime(date)}
              showTimeSelect
              locale="id"
              timeFormat="HH:mm"
              timeIntervals={30}
              dateFormat="d MMMM yyyy, HH:mm"
              className="mt-1 block w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-gray-800"
            />
          </div>
          <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-yellow-500 to-orange-500 rounded-md shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
      </div>
    </div>
  );
};

// --- Komponen Halaman Utama (Main Component) ---
export default function MentorDashboardPage() {
  const [scheduleData, setScheduleData] = useState({
    schedules: [],
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get("/api/mentor/my-schedules", {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: debouncedSearchTerm, page: currentPage, limit: 10 },
      });
      setScheduleData({
        schedules: response.data.schedules || [],
        totalPages: response.data.totalPages || 1,
      });
    } catch (err) {
      toast.error("Gagal memuat riwayat mengajar.");
      setScheduleData({ schedules: [], totalPages: 1 });
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, currentPage]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // --- Fungsi-fungsi Handler Aksi ---
  const handleActionSuccess = () => {
    setSelectedSchedule(null);
    fetchSchedules();
  };

  const handleSelect = (scheduleId) => {
    setSelectedSchedules((prev) =>
      prev.includes(scheduleId)
        ? prev.filter((id) => id !== scheduleId)
        : [...prev, scheduleId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSchedules(scheduleData.schedules.map((s) => s.schedule_id));
    } else {
      setSelectedSchedules([]);
    }
  };

  const handleCancelSchedule = async (scheduleId) => {
    if (
      !window.confirm(
        "Apakah Anda yakin ingin membatalkan jadwal ini? Admin akan diberitahu."
      )
    ) {
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `/api/mentor/my-schedules/${scheduleId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Jadwal berhasil dibatalkan.");
      fetchSchedules();
    } catch (err) {
      toast.error("Gagal membatalkan jadwal.");
    }
  };

  const handleBulkHide = async () => {
    if (selectedSchedules.length === 0) {
      toast.warn("Pilih setidaknya satu jadwal untuk dihapus.");
      return;
    }
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menyembunyikan ${selectedSchedules.length} jadwal terpilih dari tampilan Anda?`
      )
    ) {
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `/api/mentor/my-schedules/hide-bulk`,
        { scheduleIds: selectedSchedules },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setScheduleData((currentData) => ({
        ...currentData,
        schedules: currentData.schedules.filter(
          (schedule) => !selectedSchedules.includes(schedule.schedule_id)
        ),
      }));
      toast.success(
        `${selectedSchedules.length} jadwal berhasil disembunyikan.`
      );
      setSelectedSchedules([]);
    } catch (err) {
      toast.error("Gagal menyembunyikan jadwal.");
    }
  };

  const handleMarkAbsent = async (scheduleId) => {
    if (
      !window.confirm(
        "Apakah Anda yakin siswa tidak hadir pada sesi ini? Tindakan ini akan menghapus jadwal dari daftar laporan Anda."
      )
    ) {
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `/api/mentor/my-schedules/${scheduleId}/mark-absent`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Jadwal telah dihapus dari daftar laporan.");
      setScheduleData((currentData) => ({
        ...currentData,
        schedules: currentData.schedules.filter(
          (schedule) => schedule.schedule_id !== scheduleId
        ),
      }));
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gagal menandai siswa tidak hadir."
      );
    }
  };

  // --- Logika dan State Paginasi ---
  const { schedules, totalPages } = scheduleData;
  const handleNextPage = () =>
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  // --- Render Tampilan Utama ---
  return (
    <div className="relative bg-gray-50 min-h-screen">
      <ToastContainer position="top-center" theme="colored" />
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-r from-yellow-400 to-orange-500">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesOptions}
        />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {selectedSchedule && (
          <EditScheduleModal
            schedule={selectedSchedule}
            onClose={() => setSelectedSchedule(null)}
            onScheduleUpdated={handleActionSuccess}
          />
        )}

        {/* Header & Tombol Aksi */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Dasbor Mentor</h1>
            <p className="text-white/80 mt-1">
              Kelola semua jadwal sesi Anda di sini.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <Link
              href="/dashboard/mentor/create-schedule"
              className="flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
            >
              <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-5 h-5" /> Buat
              Jadwal
            </Link>
            <Link
              href="/dashboard/mentor/reports/new"
              className="flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700"
            >
              <Icon
                path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                className="w-5 h-5"
              />{" "}
              Buat Laporan
            </Link>
            <Link
              href="/dashboard/mentor/profile"
              className="col-span-2 flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              <Icon
                path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                className="w-5 h-5"
              />{" "}
              Edit Profil
            </Link>
          </div>
        </div>

        {/* Tabel Jadwal */}
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
                placeholder="Cari nama siswa atau mapel..."
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
                />
                Hapus ({selectedSchedules.length})
              </button>
            )}
          </div>

          <div className="overflow-x-auto mt-6">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tanggal & Waktu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Siswa & Mapel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status Gaji
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableSkeletonRow key={index} columns={5} />
                  ))
                ) : schedules.length > 0 ? (
                  schedules.map((schedule) => {
                    const isFuture =
                      new Date(schedule.session_datetime) > new Date();
                    return (
                      <tr
                        key={schedule.schedule_id}
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedSchedules.includes(schedule.schedule_id)
                            ? "bg-orange-50"
                            : ""
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedSchedules.includes(
                              schedule.schedule_id
                            )}
                            onChange={() => handleSelect(schedule.schedule_id)}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                          {format(
                            new Date(schedule.session_datetime),
                            "dd MMM yyyy, HH:mm",
                            { locale: id }
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-800">
                            {schedule.student_name}
                          </div>
                          <div className="text-gray-500">
                            {schedule.mapel || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                              schedule.payroll_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {schedule.payroll_status || "Belum Diproses"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {isFuture && schedule.status === "scheduled" ? (
                            <>
                              <button
                                onClick={() => setSelectedSchedule(schedule)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200"
                              >
                                <Icon
                                  path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                  className="w-4 h-4"
                                />{" "}
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleCancelSchedule(schedule.schedule_id)
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                              >
                                <Icon
                                  path="M6 18L18 6M6 6l12 12"
                                  className="w-4 h-4"
                                />{" "}
                                Batalkan
                              </button>
                            </>
                          ) : schedule.payroll_status === "Belum Lapor" ? (
                            <button
                              onClick={() =>
                                handleMarkAbsent(schedule.schedule_id)
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                            >
                              <Icon
                                path="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                className="w-4 h-4"
                              />{" "}
                              Siswa Tidak Hadir
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              Sesi Selesai
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState message="Tidak ada jadwal ditemukan." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginasi */}
          {totalPages > 1 && !isLoading && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
