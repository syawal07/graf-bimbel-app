"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  isValid, // Import `isValid` untuk memeriksa validitas tanggal
} from "date-fns";
import { id } from "date-fns/locale";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import * as XLSX from "xlsx";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// --- [KOMPONEN] Ikon SVG ---
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

// --- [KOMPONEN] Empty State ---
const EmptyState = ({ message }) => (
  <div className="text-center p-16 bg-slate-50/50 rounded-2xl my-4">
    <Icon
      path="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      className="mx-auto h-20 w-20 text-slate-300"
    />
    <p className="mt-5 text-xl font-semibold text-slate-700">{message}</p>
    <p className="mt-2 text-sm text-slate-500">
      Coba sesuaikan filter atau periode pencarian Anda.
    </p>
  </div>
);

// --- [KOMPONEN] Skeleton Loading untuk Tabel ---
const TableSkeletonRow = ({ columns }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-5">
        <div className="h-4 bg-slate-200 rounded-md w-full"></div>
      </td>
    ))}
  </tr>
);

// --- [BARU] Komponen StatusBadge ---
const StatusBadge = ({
  isPaid,
  paidText = "Lunas",
  unpaidText = "Belum Lunas",
}) => {
  const badgeColor = isPaid
    ? "bg-green-100 text-green-800"
    : "bg-amber-100 text-amber-800";

  return (
    <span
      className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full capitalize ${badgeColor}`}
    >
      {isPaid ? paidText : unpaidText}
    </span>
  );
};

// --- [FUNGSI BANTUAN] Format Tanggal Aman ---
const safeFormatDate = (dateString, formatString) => {
  if (!dateString)
    return <span className="text-slate-400 italic">Tgl. tidak ada</span>;
  const date = parseISO(dateString);
  if (!isValid(date))
    return <span className="text-slate-400 italic">Tgl. tidak valid</span>;
  return format(date, formatString, { locale: id });
};

// --- [KOMPONEN] Modal Rincian Gaji ---
const PayrollDetailsModal = ({
  item,
  dateRange,
  onClose,
  activeTab,
  statusFilter,
}) => {
  const [details, setDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  const isHistory = !!item.batch_id;
  const mentorName = item.full_name || item.mentor_name || "Detail Transaksi";
  const mentorId = item.mentor_id;
  const batchId = item.batch_id;

  useEffect(() => {
    setIsVisible(true);
    const fetchDetails = async () => {
      if (!mentorId && !batchId) {
        toast.warn("Tidak cukup data untuk menampilkan rincian.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const token = localStorage.getItem("token");
      let endpoint;
      let params = {};

      if (isHistory) {
        endpoint = `/api/admin/payroll-history/${batchId}/details`;
      } else {
        const apiType =
          activeTab === "monthly" ? "payroll-report" : "payroll-daily";
        endpoint = `/api/admin/${apiType}/${mentorId}/details`;
        params = {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          status: statusFilter,
        };
      }

      try {
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        setDetails(response.data);
      } catch (error) {
        toast.error("Gagal memuat rincian gaji.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [item, dateRange, activeTab, batchId, isHistory, mentorId, statusFilter]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const calculatedTotal = useMemo(
    () => details.reduce((sum, d) => sum + (Number(d.session_rate) || 0), 0),
    [details]
  );

  const handleDownloadExcel = () => {
    if (details.length === 0) {
      toast.warn("Tidak ada data untuk diunduh.");
      return;
    }

    const headers = [
      "Tanggal Sesi",
      "Waktu Sesi",
      "Nama Siswa",
      "Mata Pelajaran",
      "Status Bayar",
      "Nominal (Rp)",
    ];
    const dataForExcel = details.map((d) => {
      const sessionDate = d.session_datetime
        ? parseISO(d.session_datetime)
        : null;
      const isValidDate = sessionDate && isValid(sessionDate);

      return [
        isValidDate ? format(sessionDate, "dd-MM-yyyy") : "N/A",
        isValidDate ? format(sessionDate, "HH:mm") : "N/A",
        d.student_name,
        d.mapel || "",
        isHistory || d.payroll_status === "paid" ? "Lunas" : "Belum Lunas",
        Number(d.session_rate) || 0,
      ];
    });

    dataForExcel.push(["", "", "", "", "TOTAL", calculatedTotal]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataForExcel]);
    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian Gaji");
    const fileName = `Rincian_Gaji_${mentorName.replace(/\s/g, "_")}_${
      dateRange.startDate
    }_${dateRange.endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div
      className={`fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Rincian Gaji: {mentorName}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Periode:{" "}
              <span className="font-medium">
                {safeFormatDate(dateRange.startDate, "d MMM yyyy")} -{" "}
                {safeFormatDate(dateRange.endDate, "d MMM yyyy")}
              </span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 -m-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-2 sm:p-6">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Tanggal Sesi
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Siswa & Mapel
                  </th>
                  {!isHistory && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Nominal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableSkeletonRow key={i} columns={isHistory ? 3 : 4} />
                  ))
                ) : details.length > 0 ? (
                  details.map((d, index) => (
                    <tr
                      key={d.session_id || index}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {safeFormatDate(
                          d.session_datetime,
                          "dd MMM yyyy, HH:mm"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold text-slate-800">
                          {d.student_name}
                        </p>
                        <p className="text-slate-500">{d.mapel}</p>
                      </td>
                      {!isHistory && (
                        <td className="px-4 py-4 text-sm">
                          <StatusBadge isPaid={d.payroll_status === "paid"} />
                        </td>
                      )}
                      <td className="px-4 py-4 text-sm font-bold text-green-600 text-right whitespace-nowrap">
                        Rp{" "}
                        {new Intl.NumberFormat("id-ID").format(
                          d.session_rate || 0
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr key="empty-details">
                    <td colSpan={isHistory ? 3 : 4}>
                      <EmptyState message="Tidak ada rincian sesi pada periode ini." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center mt-auto p-6 bg-slate-50 border-t border-slate-200 rounded-b-3xl">
          <button
            onClick={handleDownloadExcel}
            disabled={isLoading || details.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 bg-green-100 border border-transparent rounded-lg hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm w-full sm:w-auto mb-4 sm:mb-0"
          >
            <Icon
              path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              className="w-5 h-5"
            />
            Unduh Struk (Excel)
          </button>
          <div className="text-center sm:text-right w-full sm:w-auto">
            <span className="text-sm text-slate-500 font-medium tracking-wider">
              TOTAL
            </span>
            <p className="text-2xl font-bold text-green-700">
              Rp {new Intl.NumberFormat("id-ID").format(calculatedTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- [KOMPONEN UTAMA] Halaman Gaji ---
export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [payrollData, setPayrollData] = useState({
    data: [],
    totalPages: 1,
    dataType: "summary",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: {
      startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    },
    searchQuery: "",
    status: "unpaid",
  });
  const [selectedItems, setSelectedItems] = useState([]);

  const particlesInit = useCallback(
    async (engine) => await loadSlim(engine),
    []
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Sesi Anda berakhir. Silakan login kembali.");
      setIsLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const params = {
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
      search: filters.searchQuery,
      page: currentPage,
      status: filters.status,
    };
    try {
      const endpoint =
        activeTab === "monthly"
          ? "/api/admin/payroll-report"
          : "/api/admin/payroll-daily";
      const response = await axios.get(endpoint, { headers, params });
      setPayrollData({
        data: response.data.data || [],
        totalPages: response.data.totalPages || 1,
        dataType: response.data.dataType || "summary",
      });
      setSelectedItems([]);
    } catch (error) {
      toast.error("Gagal memuat data gaji.");
      setPayrollData({ data: [], totalPages: 1, dataType: "summary" });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filters, currentPage]);

  // Pola ini digunakan untuk me-reset halaman ke 1 saat filter berubah,
  // sambil menghindari pemanggilan data ganda (double fetch).
  useEffect(() => {
    // Jangan panggil fetch jika ini adalah render pertama kali
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchData();
    }
  }, [activeTab, filters]);

  // Efek ini hanya berjalan saat halaman berubah.
  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePay = async (mentor) => {
    const amount = mentor.total_unpaid_salary;
    if (
      !window.confirm(
        `Yakin membayar gaji ${
          mentor.full_name
        } sebesar Rp ${new Intl.NumberFormat("id-ID").format(amount)}?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    const endpoint =
      activeTab === "monthly"
        ? `/api/admin/payroll-report/mark-paid`
        : `/api/admin/payroll-daily/mark-paid`;
    const body = {
      mentor_id: mentor.mentor_id,
      start_date: filters.dateRange.startDate,
      end_date: filters.dateRange.endDate,
    };

    try {
      const response = await axios.put(endpoint, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(response.data.message || `Gaji berhasil dibayar.`);
      fetchData(); // Muat ulang data
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menandai lunas.");
    }
  };

  const handleSelectOne = (e, idToToggle) => {
    if (e.target.checked) {
      setSelectedItems((prev) => [...prev, idToToggle]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== idToToggle));
    }
  };

  const isAll = filters.status === "all";
  const isUnpaid = filters.status === "unpaid";

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // PERBAIKAN: Gunakan ID yang benar tergantung tab aktif
      const allIds = isAll
        ? payrollData.data.map((item) => item.batch_id)
        : payrollData.data
            .filter((mentor) => (mentor.unpaid_sessions || 0) > 0)
            .map((mentor) => mentor.mentor_id);
      setSelectedItems(allIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkPay = async () => {
    if (selectedItems.length === 0) {
      toast.warn("Pilih setidaknya satu mentor untuk dibayar.");
      return;
    }
    if (
      !window.confirm(
        `Yakin ingin membayar gaji untuk ${selectedItems.length} mentor terpilih?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    const endpoint =
      activeTab === "monthly"
        ? `/api/admin/payroll-report/mark-paid-bulk`
        : `/api/admin/payroll-daily/mark-paid-bulk`;
    const body = {
      mentor_ids: selectedItems,
      start_date: filters.dateRange.startDate,
      end_date: filters.dateRange.endDate,
    };

    try {
      const response = await axios.put(endpoint, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(
        response.data.message ||
          `${selectedItems.length} gaji berhasil dibayar.`
      );
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gagal melakukan pembayaran massal."
      );
    }
  };

  const handleBulkHide = async () => {
    if (selectedItems.length === 0) {
      toast.warn("Pilih setidaknya satu riwayat untuk disembunyikan.");
      return;
    }
    if (
      !window.confirm(
        `Yakin ingin menyembunyikan ${selectedItems.length} riwayat pembayaran terpilih?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    try {
      const response = await axios.put(
        "/api/admin/payroll-history/hide-bulk",
        { batchIds: selectedItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gagal menyembunyikan riwayat."
      );
    }
  };

  const setPeriod = (period) => {
    const today = new Date();
    const start =
      period === "this_month"
        ? startOfMonth(today)
        : startOfMonth(subMonths(today, 1));
    const end =
      period === "this_month"
        ? endOfMonth(today)
        : endOfMonth(subMonths(today, 1));
    handleFilterChange("dateRange", {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    });
  };

  const { data: currentData, totalPages } = payrollData;
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const selectableItemsCount = useMemo(() => {
    if (isAll) return currentData.length;
    if (isUnpaid)
      return currentData.filter((m) => (m.unpaid_sessions || 0) > 0).length;
    return 0;
  }, [currentData, isAll, isUnpaid]);

  const isAllSelected =
    selectableItemsCount > 0 && selectedItems.length === selectableItemsCount;

  return (
    <div className="relative bg-slate-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" autoClose={3000} />
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-amber-500 to-orange-600">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fullScreen: { enable: false },
            background: { color: "transparent" },
            particles: {
              number: { value: 30, density: { enable: true, value_area: 800 } },
              color: { value: "#ffffff" },
              shape: { type: "circle" },
              opacity: { value: 0.5, random: true },
              size: { value: 3, random: true },
              move: {
                enable: true,
                speed: 1,
                direction: "top",
                out_mode: "out",
              },
            },
            interactivity: {
              events: { onhover: { enable: true, mode: "bubble" } },
              modes: {
                bubble: { distance: 200, size: 6, duration: 2, opacity: 0.8 },
              },
            },
          }}
        />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {selectedItem && (
          <PayrollDetailsModal
            item={selectedItem}
            dateRange={filters.dateRange}
            onClose={() => setSelectedItem(null)}
            activeTab={activeTab}
            statusFilter={filters.status}
          />
        )}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
            Manajemen Gaji Mentor 💰
          </h1>
          <p className="text-white/80 mt-2 text-lg drop-shadow-sm">
            Kelola, bayar, dan lihat rincian gaji mentor dengan mudah.
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-2xl">
          <div className="border-b border-slate-200">
            <nav
              className="-mb-px flex space-x-6 sm:space-x-8"
              aria-label="Tabs"
            >
              {/* Tombol Tab */}
              <button
                onClick={() => setActiveTab("monthly")}
                className={`${
                  activeTab === "monthly"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                } group inline-flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-base transition-all`}
              >
                <Icon
                  path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
                  className="w-5 h-5"
                />
                Gaji Bulanan
              </button>
              <button
                onClick={() => setActiveTab("daily")}
                className={`${
                  activeTab === "daily"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                } group inline-flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-base transition-all`}
              >
                <Icon
                  path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  className="w-5 h-5"
                />
                Gaji Harian
              </button>
            </nav>
          </div>

          {/* Filter Section */}
          <div className="py-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {activeTab === "monthly" ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setPeriod("this_month")}
                    className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 transition-all shadow-sm"
                  >
                    Bulan Ini
                  </button>
                  <button
                    onClick={() => setPeriod("last_month")}
                    className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 transition-all shadow-sm"
                  >
                    Bulan Lalu
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="daily-date-picker"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Pilih Tanggal:
                  </label>
                  <input
                    id="daily-date-picker"
                    type="date"
                    value={filters.dateRange.startDate}
                    onChange={(e) =>
                      handleFilterChange("dateRange", {
                        startDate: e.target.value,
                        endDate: e.target.value,
                      })
                    }
                    className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 transition-all shadow-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              )}
              <div className="relative w-full md:w-auto flex-grow md:flex-grow-0 md:ml-auto">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Icon
                    path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    className="h-5 w-5 text-slate-400"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Cari mentor..."
                  value={filters.searchQuery}
                  onChange={(e) =>
                    handleFilterChange("searchQuery", e.target.value)
                  }
                  className="w-full md:w-72 rounded-lg border-slate-300 shadow-sm pl-11 placeholder:text-slate-400 focus:border-orange-500 focus:ring-orange-500 sm:text-sm px-4 py-2.5 transition-all"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => handleFilterChange("status", "unpaid")}
                  className={`flex-1 text-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    isUnpaid
                      ? "bg-white text-orange-600 shadow-md"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Belum Lunas
                </button>
                <button
                  onClick={() => handleFilterChange("status", "all")}
                  className={`flex-1 text-center px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    isAll
                      ? "bg-white text-orange-600 shadow-md"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Riwayat Lunas
                </button>
              </div>

              {isUnpaid && selectedItems.length > 0 && (
                <button
                  onClick={handleBulkPay}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all shadow-lg w-full sm:w-auto"
                >
                  <Icon
                    path="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    className="w-5 h-5"
                  />
                  Bayar Terpilih ({selectedItems.length})
                </button>
              )}
              {isAll && selectedItems.length > 0 && (
                <button
                  onClick={handleBulkHide}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all shadow-lg w-full sm:w-auto"
                >
                  <Icon
                    path="M3.98 8.223A.75.75 0 003 9v6a.75.75 0 00.98.727l2.252-.451a.75.75 0 00.727-.98l-.45-2.252a.75.75 0 00-.98-.727L3.98 8.223zM8.25 3a.75.75 0 00-.75.75v16.5a.75.75 0 001.5 0V3.75A.75.75 0 008.25 3z"
                    className="w-5 h-5"
                  />
                  Hapus ({selectedItems.length})
                </button>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              {isAll ? (
                // --- Tabel Riwayat Lunas ---
                <>
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 w-4">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={isAllSelected}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                        Tanggal Bayar
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                        Nama Mentor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                        Total Dibayar
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                        Detail
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">
                        Dibayar Oleh
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableSkeletonRow key={i} columns={7} />
                      ))
                    ) : currentData.length > 0 ? (
                      currentData.map((item, index) => (
                        <tr
                          key={item.batch_id || index}
                          className={`hover:bg-slate-50 ${
                            selectedItems.includes(item.batch_id)
                              ? "bg-orange-50"
                              : ""
                          }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(item.batch_id)}
                              onChange={(e) =>
                                handleSelectOne(e, item.batch_id)
                              }
                              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                            {safeFormatDate(
                              item.payment_date,
                              "d MMM yyyy, HH:mm"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                            {item.mentor_name || (
                              <span className="text-slate-400 italic">
                                (Tidak ada nama)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            Rp{" "}
                            {new Intl.NumberFormat("id-ID").format(
                              item.total_amount_paid
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {item.total_sessions_paid} Sesi
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {item.admin_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="text-orange-600 hover:underline text-sm font-semibold"
                            >
                              Lihat Rincian
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr key="empty-history-row">
                        <td colSpan={7}>
                          <EmptyState message="Tidak ada riwayat pembayaran pada periode ini." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </>
              ) : (
                // --- Tabel Belum Lunas ---
                <>
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="pr-2 pl-6 py-4 text-left">
                        <input
                          type="checkbox"
                          className="form-checkbox text-orange-500 rounded border-slate-300 focus:ring-orange-500 w-4 h-4"
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="px-2 py-4 text-left text-xs font-semibold text-slate-600">
                        Nama Mentor
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">
                        {activeTab === "monthly"
                          ? "Sesi (Unpaid/Total)"
                          : "Sesi Unpaid"}
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600">
                        Total Gaji
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableSkeletonRow key={i} columns={6} />
                      ))
                    ) : currentData.length > 0 ? (
                      currentData.map((mentor, index) => (
                        <tr
                          key={mentor.mentor_id || index}
                          className={`hover:bg-slate-50 ${
                            selectedItems.includes(mentor.mentor_id)
                              ? "bg-orange-50"
                              : ""
                          }`}
                        >
                          <td className="pr-2 pl-6 py-4 text-left">
                            {(mentor.unpaid_sessions || 0) > 0 && (
                              <input
                                type="checkbox"
                                className="form-checkbox text-orange-500 rounded border-slate-300 focus:ring-orange-500 w-4 h-4"
                                checked={selectedItems.includes(
                                  mentor.mentor_id
                                )}
                                onChange={(e) =>
                                  handleSelectOne(e, mentor.mentor_id)
                                }
                              />
                            )}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap">
                            <p className="font-semibold text-slate-900 text-base">
                              {mentor.full_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {mentor.email}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            <span className="font-bold text-lg text-red-600">
                              {mentor.unpaid_sessions || 0}
                            </span>
                            {activeTab === "monthly" &&
                              ` / ${mentor.total_sessions || 0}`}{" "}
                            Sesi
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-slate-800 text-right">
                            Rp{" "}
                            {new Intl.NumberFormat("id-ID").format(
                              mentor.total_unpaid_salary || 0
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <StatusBadge
                              isPaid={(mentor.unpaid_sessions || 0) === 0}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center space-x-2">
                            <button
                              onClick={() => setSelectedItem(mentor)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-all shadow-sm"
                            >
                              <Icon
                                path="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                                className="w-4 h-4"
                              />{" "}
                              Rincian
                            </button>
                            {(mentor.unpaid_sessions || 0) > 0 && (
                              <button
                                onClick={() => handlePay(mentor)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-transparent text-white bg-green-600 rounded-md hover:bg-green-700 transition-all shadow-sm"
                              >
                                <Icon
                                  path="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m3-3.75l-3 3m0 0l-3-3m3 3V1.5m6 5.25h6m-6 2.25h6m-6 3.75h6"
                                  className="w-4 h-4"
                                />{" "}
                                Bayar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr key="empty-summary-row">
                        <td colSpan={6}>
                          <EmptyState message="Tidak ada data gaji ditemukan." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </>
              )}
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && !isLoading && (
            <div className="flex justify-between items-center mt-6 pt-5 border-t border-slate-200">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Icon
                  path="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  className="w-4 h-4"
                />{" "}
                Sebelumnya
              </button>
              <span className="text-sm text-slate-600">
                Halaman <strong>{currentPage}</strong> dari{" "}
                <strong>{totalPages}</strong>
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Selanjutnya{" "}
                <Icon
                  path="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  className="w-4 h-4"
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
