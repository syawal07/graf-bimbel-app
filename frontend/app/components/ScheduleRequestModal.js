// frontend/app/components/ScheduleRequestModal.js
"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { toast } from "react-toastify";

const ScheduleRequestModal = ({ isOpen, onClose, userPackageId }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        "/api/students/request-schedule",
        {
          user_package_id: userPackageId,
          preferred_datetime: startDate,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Permintaan jadwal berhasil dikirim!");
      onClose(); // Tutup modal setelah berhasil
    } catch (error) {
      console.error("Gagal mengajukan jadwal:", error);
      toast.error(
        error.response?.data?.message || "Gagal mengirim permintaan."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Pilih Tanggal & Waktu Sesi</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              showTimeSelect
              dateFormat="Pp" // Format: Tanggal dan Waktu
              className="w-full p-2 border rounded"
              minDate={new Date()} // Tidak bisa memilih tanggal di masa lalu
            />
            <p className="text-xs text-gray-500 mt-1">
              Pilih tanggal dan waktu yang Anda inginkan untuk sesi bimbel.
            </p>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Mengirim..." : "Kirim Permintaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleRequestModal;
