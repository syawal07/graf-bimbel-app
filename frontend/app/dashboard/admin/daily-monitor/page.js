"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx"; // 1. Impor library xlsx

// Fungsi untuk format tanggal YYYY-MM-DD
const getTodayDateString = () => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

export default function DailyMonitorPage() {
  const [schedules, setSchedules] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [isLoading, setIsLoading] = useState(false);

  const fetchSchedules = async (date) => {
    if (!date) return;
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get("/api/admin/schedules/by-date", {
        params: { date: date },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSchedules(response.data);
    } catch (error) {
      toast.error("Gagal memuat jadwal untuk tanggal ini.");
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // 2. Fungsi baru untuk menangani unduh Excel
  const handleDownloadExcel = () => {
    if (schedules.length === 0) {
      toast.info("Tidak ada data untuk diunduh.");
      return;
    }

    // Ubah data agar sesuai format yang diinginkan
    const dataForExcel = schedules.map((schedule) => ({
      Waktu: new Date(schedule.session_datetime).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      "Nama Siswa": schedule.student_name,
      "Nama Mentor": schedule.mentor_name,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Harian");

    // Atur lebar kolom
    worksheet["!cols"] = [
      { wch: 10 }, // Waktu
      { wch: 30 }, // Nama Siswa
      { wch: 30 }, // Nama Mentor
    ];

    // Buat dan unduh file
    XLSX.writeFile(workbook, `Laporan Harian - ${selectedDate}.xlsx`);
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&family=Poppins:wght@400;500;600&display=swap");
        body {
          font-family: "Poppins", sans-serif;
          background-color: #f9fafb; /* bg-gray-50 */
        }
        .font-heading {
          font-family: "Quicksand", sans-serif;
        }
      `}</style>
      <div className="p-8 bg-gray-50 min-h-screen text-gray-800">
        <ToastContainer position="top-center" />
        <h1 className="text-3xl font-bold font-heading mb-6">
          Monitoring Kelas Harian
        </h1>

        {/* Panel Kontrol Tanggal */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label
              htmlFor="monitorDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pilih Tanggal
            </label>
            <input
              type="date"
              id="monitorDate"
              value={selectedDate}
              onChange={handleDateChange}
              className="block w-full md:w-auto p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          {/* 3. Tombol Unduh Excel ditambahkan di sini */}
          <div className="w-full sm:w-auto mt-2 sm:mt-0 sm:self-end">
            <button
              onClick={handleDownloadExcel}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              Unduh Excel
            </button>
          </div>
        </div>

        {/* Ringkasan & Daftar Kelas */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4 border-b pb-4">
            <h2 className="text-xl font-semibold font-heading">
              Jadwal untuk{" "}
              {new Date(selectedDate).toLocaleDateString("id-ID", {
                dateStyle: "full",
              })}
            </h2>
            <p className="text-gray-600">
              Total Kelas:{" "}
              <span className="font-bold text-orange-600 text-lg">
                {schedules.length}
              </span>
            </p>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <p className="text-center py-4">Memuat jadwal...</p>
            ) : schedules.length > 0 ? (
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-orange-800 uppercase bg-orange-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-l-lg">
                      Waktu
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Siswa
                    </th>
                    <th scope="col" className="px-6 py-3 rounded-r-lg">
                      Mentor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr
                      key={schedule.schedule_id}
                      className="bg-white border-b hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-mono font-semibold text-gray-700">
                        {new Date(schedule.session_datetime).toLocaleTimeString(
                          "id-ID",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <Link
                          href={`/dashboard/admin/users/student-profile/${schedule.student_id}`}
                          className="text-orange-600 hover:underline"
                        >
                          {schedule.student_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/admin/tutors/${schedule.mentor_id}/profile`}
                          className="text-blue-600 hover:underline"
                        >
                          {schedule.mentor_name}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Tidak ada jadwal untuk tanggal ini.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
