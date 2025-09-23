"use client";

// --- Imports Eksternal ---
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { id } from "date-fns/locale";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// Opsi untuk Partikel Latar Belakang
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

// Komponen UI Tambahan
const EmptyState = ({ message }) => (
  <div className="text-center p-10">
    <Icon
      path="M3.75 9.75h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      className="mx-auto h-16 w-16 text-gray-300"
    />
    <p className="mt-4 font-semibold text-gray-600">{message}</p>
    <p className="mt-1 text-sm text-gray-500">
      Coba ubah rentang tanggal yang Anda cari.
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

export default function GlobalSchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [activePreset, setActivePreset] = useState("Hari Ini");
  const [selectedSchedules, setSelectedSchedules] = useState([]);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get("/api/admin/schedules", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      setSchedules(response.data);
      setSelectedSchedules([]);
    } catch (err) {
      toast.error("Gagal memuat jadwal global.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleBulkHide = async () => {
    if (selectedSchedules.length === 0) {
      toast.warn("Pilih setidaknya satu jadwal untuk disembunyikan.");
      return;
    }
    if (
      !confirm(
        `Yakin ingin menyembunyikan ${selectedSchedules.length} jadwal terpilih dari tampilan Anda?`
      )
    ) {
      return;
    }

    const token = localStorage.getItem("token");
    try {
      await axios.put(
        "/api/admin/schedules/hide-bulk",
        { scheduleIds: selectedSchedules },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(
        `${selectedSchedules.length} jadwal berhasil disembunyikan.`
      );
      fetchSchedules();
    } catch (err) {
      toast.error("Gagal menyembunyikan jadwal.");
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedSchedules(schedules.map((s) => s.schedule_id));
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

  const handlePresetClick = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    if (preset === "Hari Ini") {
      setStartDate(startOfDay(today));
      setEndDate(endOfDay(today));
    } else if (preset === "Pekan Ini") {
      setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
      setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
    } else if (preset === "Bulan Ini") {
      setStartDate(startOfMonth(today));
      setEndDate(endOfMonth(today));
    }
  };

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setStartDate(start);
    setEndDate(end);
    setActivePreset("Custom");
  };

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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Jadwal Global</h1>
            <p className="text-white/80 mt-1">
              Pantau dan kelola seluruh jadwal sesi bimbingan di sini.
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-center space-x-2">
              <button
                onClick={() => handlePresetClick("Hari Ini")}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  activePreset === "Hari Ini"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => handlePresetClick("Pekan Ini")}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  activePreset === "Pekan Ini"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Pekan Ini
              </button>
              <button
                onClick={() => handlePresetClick("Bulan Ini")}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  activePreset === "Bulan Ini"
                    ? "bg-orange-500 text-white shadow"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Bulan Ini
              </button>
            </div>
            <div className="w-full md:w-auto">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateChange}
                dateFormat="dd MMM yyyy"
                className="w-full md:w-64 text-center rounded-md border-gray-300 shadow-sm focus:ring-orange-500 focus:border-orange-500 py-2 text-gray-800"
                placeholderText="Pilih Rentang Tanggal"
              />
            </div>
          </div>

          {selectedSchedules.length > 0 && (
            <div className="mb-4">
              <button
                onClick={handleBulkHide}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 shadow-sm transition-colors"
              >
                <Icon
                  path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                  className="w-4 h-4"
                />
                Sembunyikan ({selectedSchedules.length}) Jadwal Terpilih
              </button>
            </div>
          )}

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
                      className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Siswa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mentor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu Sesi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableSkeletonRow key={index} columns={5} />
                  ))
                ) : schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <tr
                      key={schedule.schedule_id}
                      className={
                        selectedSchedules.includes(schedule.schedule_id)
                          ? "bg-orange-50"
                          : "hover:bg-gray-50 transition-colors"
                      }
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          onChange={(e) =>
                            handleSelectOne(e, schedule.schedule_id)
                          }
                          checked={selectedSchedules.includes(
                            schedule.schedule_id
                          )}
                          className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {schedule.student_name || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {schedule.package_name || "Sesi Harian"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {schedule.mentor_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {format(
                          new Date(schedule.session_datetime),
                          "EEEE, dd MMM yyyy, HH:mm",
                          { locale: id }
                        )}{" "}
                        WIB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                            schedule.status === "scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {schedule.status === "student_absent"
                            ? "Siswa Tidak Hadir"
                            : "Terjadwal"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">
                      <EmptyState message="Tidak ada jadwal ditemukan." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
