"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useDebounce } from "use-debounce";

// --- Komponen Ikon (Tidak ada perubahan) ---
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
const EmptyState = ({ message, children }) => (
  // REFINED: Desain EmptyState lebih bersih dan modern
  <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200">
    <Icon
      path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      className="mx-auto h-16 w-16 text-slate-300"
    />
    <p className="mt-4 text-lg font-semibold text-slate-800">{message}</p>
    <div className="mt-2 text-sm text-slate-500">{children}</div>
  </div>
);

// REFINED: Style input dasar untuk konsistensi
const baseInputStyle =
  "block w-full rounded-lg border-slate-300 shadow-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500 px-4 py-2.5 transition-shadow duration-150";

// --- Komponen Editor Jadwal Interaktif untuk Admin ---
const WeeklyScheduleEditor = ({ initialSchedule, onScheduleChange }) => {
  const [schedule, setSchedule] = useState(initialSchedule || []);
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const timeSlots = Array.from(
    { length: 15 },
    (_, i) => `${String(i + 7).padStart(2, "0")}:00`
  );

  const handleSlotClick = (dayIndex, time) => {
    const dayOfWeek = dayIndex + 1;
    const startTime = time;
    const endTime = `${String(parseInt(time.split(":")[0]) + 1).padStart(
      2,
      "0"
    )}:00`;

    const newSchedule = [...schedule];
    const existingSlotIndex = newSchedule.findIndex(
      (s) => s.day_of_week === dayOfWeek && s.start_time === startTime
    );

    if (existingSlotIndex > -1) {
      newSchedule.splice(existingSlotIndex, 1);
    } else {
      newSchedule.push({
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      });
    }
    setSchedule(newSchedule);
    onScheduleChange(newSchedule);
  };

  return (
    // REFINED: Tampilan lebih bersih, padding lebih baik
    <div className="mt-3 border rounded-lg p-3 bg-slate-50 max-h-64 overflow-y-auto">
      <h4 className="font-semibold text-slate-800 mb-3 text-xs">
        Atur Jadwal Tetap Mentor
      </h4>
      <div className="overflow-x-auto">
        {/* REFINED: Spasi antar sel lebih jelas */}
        <table className="w-full text-xs text-center border-separate border-spacing-1">
          <thead>
            <tr>
              {days.map((day) => (
                <th key={day} className="p-1 font-semibold text-slate-600">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((time) => (
              <tr key={time}>
                {days.map((day, dayIndex) => {
                  const isActive = schedule.some(
                    (s) =>
                      s.day_of_week === dayIndex + 1 && s.start_time === time
                  );
                  return (
                    <td key={`${day}-${time}`} className="p-0">
                      <button
                        type="button"
                        onClick={() => handleSlotClick(dayIndex, time)}
                        // REFINED: Warna lebih kontras, efek hover lebih jelas
                        className={`w-full h-5 rounded-md transition-colors ${
                          isActive
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-slate-200 hover:bg-slate-300"
                        }`}
                        title={`${day}, ${time}`}
                      ></button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Komponen Modal Verifikasi ---
const VerificationModal = ({ payment, onClose, onVerified }) => {
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [availableMentors, setAvailableMentors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [assignedMentors, setAssignedMentors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!payment?.payment_id) return;
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(
          `/api/admin/payments/pending/${payment.payment_id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPaymentDetails(response.data.paymentDetails);
        setAvailableMentors(response.data.availableMentors || []);
      } catch (error) {
        toast.error("Gagal memuat data detail untuk verifikasi.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [payment]);

  const handleAddMentor = (mentor) => {
    if (assignedMentors.some((m) => m.mentor_id === mentor.user_id)) return;
    setAssignedMentors((prev) => [
      ...prev,
      {
        mentor_id: mentor.user_id,
        full_name: mentor.full_name,
        weekly_schedule: mentor.weekly_schedule || [],
        session_rate: "",
        assignment_type: prev.length === 0 ? "utama" : "cadangan",
      },
    ]);
    setSearchTerm("");
  };

  const handleRemoveMentor = (mentorId) => {
    setAssignedMentors((prev) => prev.filter((m) => m.mentor_id !== mentorId));
  };

  const handleMentorDetailChange = (mentorId, field, value) => {
    setAssignedMentors((prev) =>
      prev.map((m) => (m.mentor_id === mentorId ? { ...m, [field]: value } : m))
    );
  };

  const handleScheduleChange = (mentorId, newSchedule) => {
    setAssignedMentors((prev) =>
      prev.map((m) =>
        m.mentor_id === mentorId ? { ...m, weekly_schedule: newSchedule } : m
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (assignedMentors.length === 0)
      return toast.warn("Harap tugaskan setidaknya satu mentor.");
    const primaryMentors = assignedMentors.filter(
      (m) => m.assignment_type === "utama"
    );
    if (primaryMentors.length !== 1)
      return toast.error("Harus ada tepat satu mentor utama.");

    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    const payload = {
      schedule_recommendation: recommendation,
      mentors: assignedMentors.map(
        ({ mentor_id, session_rate, assignment_type, weekly_schedule }) => ({
          mentor_id,
          session_rate,
          assignment_type,
          weekly_schedule,
        })
      ),
    };

    try {
      await axios.put(
        `/api/admin/payments/${payment.payment_id}/verify`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Pembayaran berhasil diverifikasi!");
      onVerified();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memverifikasi.");
      setIsSubmitting(false);
    }
  };

  const filteredMentors = availableMentors.filter((mentor) => {
    const query = searchTerm.toLowerCase();
    if (!query) return false;
    return mentor.full_name.toLowerCase().includes(query);
  });

  return (
    // REFINED: Transisi backdrop lebih halus
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-40 p-4 transition-opacity">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start border-b border-slate-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            Proses Verifikasi & Plotting Jadwal
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon path="M6 18L18 6M6 6l12 12" />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center p-10 text-slate-500">Memuat data...</div>
        ) : (
          <form
            onSubmit={handleSubmit}
            // REFINED: Scrollbar lebih baik & layout lebih konsisten
            className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 pr-3 -mr-3"
          >
            {/* --- KOLOM KIRI --- */}
            <div className="space-y-6 flex flex-col">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm text-slate-700">
                <p>
                  <strong className="text-slate-800">Siswa:</strong> {paymentDetails?.student_name}
                </p>
                <p>
                  <strong className="text-slate-800">Paket:</strong> {paymentDetails?.package_name}
                </p>
                <a
                  href={`http://localhost:5000/${paymentDetails?.payment_proof_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 text-orange-600 hover:underline font-semibold"
                >
                  <Icon path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" className="w-4 h-4"/>
                  Lihat Bukti Transfer
                </a>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-700">
                  Tambah Mentor <span className="text-slate-500 font-normal">({assignedMentors.length}/5)</span>
                </label>
                <div className="relative">
                    <input type="text" placeholder="🔍 Cari nama mentor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${baseInputStyle} focus:ring-2 focus:ring-orange-300`}/>
                    {searchTerm && (
                    <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto border border-slate-200 rounded-md bg-white shadow-xl">
                        {filteredMentors.length > 0 ? (
                        filteredMentors.map((mentor) => (
                            <div key={mentor.user_id} onClick={() => handleAddMentor(mentor)} className="p-3 text-sm border-b last:border-none border-slate-100 hover:bg-orange-50 cursor-pointer transition-colors duration-150">
                            <span className="font-medium text-slate-800">{mentor.full_name}</span>
                            </div>
                        ))
                        ) : (
                        <div className="p-3 text-slate-500 text-sm italic">
                            Mentor tidak ditemukan.
                        </div>
                        )}
                    </div>
                    )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="recommendation" className="font-semibold text-slate-700">
                  Rekomendasi Jadwal (Opsional)
                </label>
                <textarea id="recommendation" rows="2" value={recommendation} onChange={(e) => setRecommendation(e.target.value)} className={baseInputStyle} placeholder="Contoh: Fokus pada Fisika & Kimia di hari Selasa & Kamis..."></textarea>
              </div>
            </div>

            {/* --- KOLOM KANAN --- */}
            <div className="space-y-4 flex flex-col mt-6 md:mt-0">
                <h3 className="font-bold text-slate-800">Mentor Ditugaskan</h3>
                <div className="space-y-3 flex-grow max-h-[calc(100%-8rem)] overflow-y-auto pr-2 -mr-2 border rounded-xl p-3 bg-slate-50/70">
                {assignedMentors.length > 0 ? (
                    assignedMentors.map((m, index) => (
                    <div key={m.mentor_id} className="bg-white p-4 border border-slate-200 rounded-lg space-y-3 shadow-sm">
                        <div className="flex justify-between items-start">
                        <p className="font-semibold text-slate-800">{m.full_name}</p>
                        <button type="button" onClick={() => handleRemoveMentor(m.mentor_id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Icon path="M6 18L18 6M6 6l12 12" className="w-5 h-5"/>
                        </button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <input type="number" placeholder="Tarif (Rp)" value={m.session_rate} onChange={(e) => handleMentorDetailChange( m.mentor_id, "session_rate", e.target.value)} className={`${baseInputStyle} text-sm py-2`}/>
                            
                            {/* REFINED: Tampilan toggle lebih modern */}
                            <div className="flex-shrink-0 flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-auto">
                                <button type="button" onClick={() => handleMentorDetailChange(m.mentor_id, "assignment_type", "utama")} className={`w-1/2 sm:w-auto px-3 py-1 text-xs rounded-md transition-all ${ m.assignment_type === "utama" ? "bg-white shadow text-orange-600 font-bold" : "text-slate-600 hover:bg-slate-200" }`}>
                                    Utama
                                </button>
                                <button type="button" onClick={() => handleMentorDetailChange( m.mentor_id, "assignment_type", "cadangan" )} className={`w-1/2 sm:w-auto px-3 py-1 text-xs rounded-md transition-all ${ m.assignment_type === "cadangan" ? "bg-white shadow text-orange-600 font-bold" : "text-slate-600 hover:bg-slate-200" }`}>
                                    Cadangan
                                </button>
                            </div>
                        </div>
                        <WeeklyScheduleEditor
                            initialSchedule={m.weekly_schedule}
                            onScheduleChange={(newSchedule) =>
                                handleScheduleChange(m.mentor_id, newSchedule)
                            }
                        />
                    </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-center text-sm text-slate-500 py-10">
                            Belum ada mentor yang ditugaskan.
                        </p>
                    </div>
                )}
                </div>
                <div className="flex justify-end pt-5 border-t border-slate-200">
                    <button type="submit" disabled={isSubmitting} className="inline-flex justify-center items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                        {isSubmitting && (
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        )}
                        {isSubmitting ? "Memproses..." : "Verifikasi & Tugaskan"}
                    </button>
                </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// --- Komponen Halaman Utama ---
export default function PendingPaymentsPage() {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [verifiedPayments, setVerifiedPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [debouncedSearch] = useDebounce(historySearch, 500);
  const [selectedHistory, setSelectedHistory] = useState([]);

  const formatDateSafely = (dateString, formatStr = "dd MMM yyyy, HH:mm") => {
    if (!dateString || isNaN(new Date(dateString))) return "-";
    return format(new Date(dateString), formatStr, { locale: id });
  };

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const pendingPromise = axios.get("/api/admin/payments/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const historyPromise = axios.get("/api/admin/payments/verified", {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: historyPage, search: debouncedSearch },
      });
      const [pendingRes, historyRes] = await Promise.all([
        pendingPromise,
        historyPromise,
      ]);
      setPendingPayments(pendingRes.data);
      setVerifiedPayments(historyRes.data.payments);
      setHistoryTotalPages(historyRes.data.totalPages);
    } catch (error) {
      toast.error("Gagal memuat data pembayaran.");
    } finally {
      setIsLoading(false);
    }
  }, [historyPage, debouncedSearch]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleVerified = () => {
    setSelectedPayment(null);
    fetchAllData();
  };

  const handleSelectHistory = (paymentId) => {
    setSelectedHistory((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const handleSelectAllHistory = (e) => {
    if (e.target.checked) {
      setSelectedHistory(verifiedPayments.map((p) => p.payment_id));
    } else {
      setSelectedHistory([]);
    }
  };

  const handleBulkDeleteHistory = async () => {
    if (selectedHistory.length === 0)
      return toast.warn("Pilih setidaknya satu riwayat untuk dihapus.");
    if (
      !confirm(
        `Yakin ingin menyembunyikan ${selectedHistory.length} riwayat verifikasi terpilih?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    try {
      await axios.put(
        "/api/admin/payments/hide-bulk",
        { paymentIds: selectedHistory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(
        `${selectedHistory.length} riwayat berhasil disembunyikan.`
      );
      fetchAllData();
      setSelectedHistory([]);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gagal menyembunyikan riwayat."
      );
    }
  };

  return (
    // REFINED: Warna background lebih netral
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <ToastContainer position="top-center" theme="colored" />
      {selectedPayment && (
        <VerificationModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onVerified={handleVerified}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-2xl shadow-lg mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Verifikasi Pembayaran
          </h1>
          <p className="text-white/90 mt-1">
            Daftar pembayaran dari siswa yang menunggu persetujuan Anda.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
                <div className="h-5 bg-slate-300 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded-lg w-full mt-6"></div>
              </div>
            ))}
          </div>
        ) : pendingPayments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingPayments.map((payment) => (
              <div
                key={payment.payment_id}
                // REFINED: Efek hover dan shadow lebih halus
                className="bg-white rounded-xl shadow-md border border-transparent hover:border-orange-300 flex flex-col transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="p-6 flex-grow">
                  <p className="text-xs text-slate-500">
                    {formatDateSafely(payment.payment_date)}
                  </p>
                  <p className="font-bold text-xl mt-2 text-slate-800">
                    {payment.student_name}
                  </p>
                  <p className="text-slate-600 text-sm">
                    {payment.package_name}
                  </p>
                  <p className="text-green-600 font-bold text-lg mt-4">
                    Rp {new Intl.NumberFormat("id-ID").format(payment.amount)}
                  </p>
                </div>
                <div className="px-6 pt-4 pb-6 bg-slate-50/70 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedPayment(payment)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm"
                  >
                    <Icon path="M4.5 12.75l6 6 9-13.5" className="w-5 h-5" />
                    Proses Pembayaran
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Tidak ada pembayaran yang menunggu verifikasi.">
            Kerja bagus! Semua pembayaran sudah diproses.
          </EmptyState>
        )}

        {/* --- RIWAYAT VERIFIKASI --- */}
        <div className="mt-16 bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-5 gap-4 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">
              Riwayat Verifikasi
            </h2>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icon path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className="h-5 w-5 text-slate-400"/>
                </div>
                <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Cari siswa atau mentor..." className="w-full sm:w-64 rounded-md border-slate-300 shadow-sm pl-10 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500 text-sm px-4 py-2"/>
              </div>
              {selectedHistory.length > 0 && (
                <button onClick={handleBulkDeleteHistory} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                  <Icon path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" className="w-4 h-4"/>
                  Hapus ({selectedHistory.length})
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 w-4">
                    <input type="checkbox" onChange={handleSelectAllHistory} checked={verifiedPayments.length > 0 && selectedHistory.length === verifiedPayments.length} className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"/>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tgl. Verifikasi</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Siswa & Paket</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Mentor Ditugaskan</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Diverifikasi Oleh</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {verifiedPayments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-slate-500 py-12">Tidak ada riwayat.</td>
                  </tr>
                ) : (
                  verifiedPayments.map((payment) => (
                    <tr key={payment.payment_id} className={`${selectedHistory.includes(payment.payment_id) ? "bg-orange-50" : "hover:bg-slate-50"} transition-colors`}>
                      <td className="p-4">
                        <input type="checkbox" checked={selectedHistory.includes(payment.payment_id)} onChange={() => handleSelectHistory(payment.payment_id)} className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"/>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formatDateSafely(payment.verified_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <p className="font-semibold text-slate-900">{payment.student_name}</p>
                        <p className="text-slate-500">{payment.package_name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{payment.mentor_name || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{payment.admin_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
            <button onClick={() => setHistoryPage((p) => Math.max(p - 1, 1))} disabled={historyPage === 1} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Halaman {historyPage} dari {historyTotalPages}
            </span>
            <button onClick={() => setHistoryPage((p) => Math.min(p + 1, historyTotalPages))} disabled={historyPage === historyTotalPages || historyTotalPages === 0} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}