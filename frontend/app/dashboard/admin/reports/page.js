"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import { useDebounce } from "use-debounce";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// --- [COMPONENT] SVG Icon ---
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

// --- [COMPONENT] Empty State ---
const EmptyState = ({ message }) => (
  <div className="text-center p-16 bg-slate-50 rounded-2xl my-4 border border-dashed border-slate-200">
    <Icon
      path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      className="mx-auto h-20 w-20 text-slate-300"
    />
    <p className="mt-5 text-xl font-semibold text-slate-700">{message}</p>
    <p className="mt-2 text-sm text-slate-500">
      Saat ada laporan baru dari mentor, datanya akan muncul di sini.
    </p>
  </div>
);

// --- [COMPONENT] Report Table Skeleton ---
const ReportTableSkeleton = ({ rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex} className="animate-pulse">
        <td className="p-4">
          <div className="h-4 w-4 bg-slate-200 rounded"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-200 rounded w-4/5"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </td>
        <td className="px-6 py-4 space-x-2">
          <div className="h-8 bg-slate-200 rounded-md w-16 inline-block"></div>
          <div className="h-8 bg-slate-200 rounded-md w-20 inline-block"></div>
        </td>
      </tr>
    ))}
  </>
);

// --- [COMPONENT] Report Detail Modal (Redesigned) ---
const ReportDetailModal = ({
  report,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!!report);
  }, [report]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  // Helper component defined INSIDE the main component, but BEFORE the return statement.
  const DetailItem = ({ label, content, isFileLink = false, url = "" }) => (
    <div>
      <label className="font-semibold text-sm text-slate-700 block mb-2">
        {label}
      </label>
      {isFileLink ? (
        url ? (
          <a
            href={`http://localhost:5000/${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-800 font-semibold transition-all hover:underline"
          >
            <Icon
              path="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              className="w-5 h-5"
            />
            Unduh / Lihat File Materi
          </a>
        ) : (
          <p className="text-sm text-slate-500 italic">
            Tidak ada file yang diunggah.
          </p>
        )
      ) : (
        <div className="text-sm text-slate-800 p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-48 overflow-y-auto prose prose-sm prose-slate">
          <p>{content || `Tidak ada ${label.toLowerCase()}.`}</p>
        </div>
      )}
    </div>
  );

  if (!report) return null;

  return (
    <div
      className={`fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] transition-all duration-300 ${
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">
              Detail Laporan Sesi
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              <span className="font-semibold">{report.mentor_name}</span> &rarr;{" "}
              <span className="font-semibold">{report.student_name}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 -m-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Now we can safely use the DetailItem component */}
          <DetailItem label="Ringkasan Materi" content={report.summary} />
          <DetailItem
            label="Jurnal Perkembangan Siswa"
            content={report.student_development_journal}
          />
          <DetailItem
            label="File Materi Lampiran"
            isFileLink={true}
            url={report.material_url}
          />
        </div>
        <div className="mt-auto p-4 flex justify-between items-center bg-slate-50 border-t border-slate-200 rounded-b-3xl">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Icon path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// --- [COMPONENT] Stat Card ---
const StatCard = ({
  title,
  value,
  subTitle,
  iconPath,
  colorClass,
  iconBgClass,
  onReset,
  isLoadingReset,
}) => (
  <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200/50 flex flex-col justify-between h-full transform hover:-translate-y-1 transition-transform duration-300">
    <div className="flex items-start gap-5">
      <div
        className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-2xl ${iconBgClass}`}
      >
        <Icon path={iconPath} className={`w-7 h-7 ${colorClass}`} />
      </div>
      <div className="flex-grow">
        <p className="text-base text-slate-500 font-medium">{title}</p>
        <p className="text-4xl font-bold text-slate-800 tracking-tight">
          {value || 0}
        </p>
        {subTitle && <p className="text-xs text-slate-400 mt-1">{subTitle}</p>}
      </div>
    </div>
    {onReset && (
      <div className="mt-4 text-right">
        <button
          onClick={onReset}
          disabled={isLoadingReset}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-all shadow-md hover:shadow-lg hover:shadow-red-500/50 focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Icon
            path="M16.023 9.348h4.992v-.001a10.5 10.5 0 00-9.348-9.348c-.992 0-1.927.114-2.8.312"
            className={`w-4 h-4 ${isLoadingReset ? "animate-spin" : ""}`}
          />
          {isLoadingReset ? "Mereset..." : "Reset Hitungan"}
        </button>
      </div>
    )}
  </div>
);

const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-3xl shadow-xl animate-pulse flex items-start gap-5">
    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-slate-200"></div>
    <div className="flex-grow space-y-3 pt-1">
      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
      <div className="h-8 bg-slate-300 rounded w-1/2"></div>
    </div>
  </div>
);

// --- [MAIN PAGE] ---
export default function ReportsPage() {
  const [reportsData, setReportsData] = useState({
    reports: [],
    totalPages: 1,
    pendingCount: 0,
  });
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [lastResetDate, setLastResetDate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReset, setIsLoadingReset] = useState(false);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedReports, setSelectedReports] = useState([]);

  // State for modal
  const [viewingReport, setViewingReport] = useState(null);
  const [viewingReportIndex, setViewingReportIndex] = useState(-1);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search query to prevent excessive API calls
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  const particlesInit = useCallback(
    async (engine) => await loadSlim(engine),
    []
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      toast.warn("Sesi Anda telah berakhir. Silakan login kembali.");
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const reportsPromise = axios.get(`/api/admin/reports`, {
        headers,
        params: {
          status: filterStatus,
          page: currentPage,
          limit: 10,
          search: debouncedSearchQuery, // The backend needs to handle this 'search' parameter
        },
      });
      const verifiedCountPromise = axios.get(
        "/api/admin/reports/verified-count",
        { headers }
      );

      const [reportsRes, verifiedCountRes] = await Promise.all([
        reportsPromise,
        verifiedCountPromise,
      ]);

      setReportsData({
        reports: reportsRes.data.reports || [],
        totalPages: reportsRes.data.totalPages || 1,
        pendingCount: reportsRes.data.pendingCount || 0,
      });
      setVerifiedCount(verifiedCountRes.data.count);
      setLastResetDate(verifiedCountRes.data.lastResetDate);
      setSelectedReports([]); // Clear selection on data refresh
    } catch (err) {
      toast.error("Gagal memuat data laporan. Coba muat ulang halaman.");
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, currentPage, debouncedSearchQuery]);

  // Effect to reset page to 1 when filters or search query change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filterStatus, debouncedSearchQuery]);

  // Effect to fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  const handleResetCount = async () => {
    if (
      !window.confirm(
        "Anda yakin ingin mereset hitungan laporan yang diverifikasi? Angka akan kembali ke 0."
      )
    )
      return;
    setIsLoadingReset(true);
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        "/api/admin/reports/reset-count",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Hitungan berhasil direset!");
      fetchData(); // Refetch to update UI
    } catch (err) {
      toast.error("Gagal mereset hitungan.");
    } finally {
      setIsLoadingReset(false);
    }
  };

  const handleVerify = async (report_id) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `/api/admin/reports/${report_id}/verify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Laporan berhasil diverifikasi!");
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gagal memverifikasi laporan."
      );
    }
  };

  const handleHideSelected = async () => {
    if (selectedReports.length === 0) {
      toast.warn("Pilih setidaknya satu laporan untuk disembunyikan.");
      return;
    }
    if (
      !confirm(
        `Yakin ingin menyembunyikan ${selectedReports.length} laporan terpilih?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    try {
      await axios.put(
        "/api/admin/reports/hide-bulk",
        { reportIds: selectedReports },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(
        `${selectedReports.length} laporan berhasil disembunyikan.`
      );
      fetchData();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gagal menyembunyikan laporan."
      );
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReports(reportsData.reports.map((r) => r.report_id));
    } else {
      setSelectedReports([]);
    }
  };

  const handleSelectOne = (e, report_id) => {
    if (e.target.checked) {
      setSelectedReports((prev) => [...prev, report_id]);
    } else {
      setSelectedReports((prev) => prev.filter((id) => id !== report_id));
    }
  };

  // Modal Navigation Handlers
  const handleViewReport = (report) => {
    const index = reportsData.reports.findIndex(
      (r) => r.report_id === report.report_id
    );
    setViewingReport(report);
    setViewingReportIndex(index);
  };

  const handleNextInModal = () => {
    const nextIndex = viewingReportIndex + 1;
    if (nextIndex < reportsData.reports.length) {
      setViewingReport(reportsData.reports[nextIndex]);
      setViewingReportIndex(nextIndex);
    }
  };

  const handlePrevInModal = () => {
    const prevIndex = viewingReportIndex - 1;
    if (prevIndex >= 0) {
      setViewingReport(reportsData.reports[prevIndex]);
      setViewingReportIndex(prevIndex);
    }
  };

  // Pagination Handlers
  const handleNextPage = () =>
    setCurrentPage((p) => Math.min(p + 1, reportsData.totalPages));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  const { reports, totalPages } = reportsData;

  return (
    <div className="bg-slate-100 min-h-screen font-sans">
      <ToastContainer position="top-center" theme="colored" autoClose={3000} />
      <ReportDetailModal
        report={viewingReport}
        onClose={() => setViewingReport(null)}
        onNext={handleNextInModal}
        onPrev={handlePrevInModal}
        hasNext={viewingReportIndex < reports.length - 1}
        hasPrev={viewingReportIndex > 0}
      />

      <div className="relative">
        <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-amber-500 to-orange-600">
          <Particles
            id="tsparticles"
            init={particlesInit}
            options={{
              fullScreen: { enable: false },
              background: { color: { value: "transparent" } },
              particles: {
                number: { value: 30 },
                color: { value: "#ffffff" },
                opacity: { value: 0.3 },
                size: { value: { min: 1, max: 4 } },
                move: { enable: true, speed: 0.5 },
                links: {
                  enable: true,
                  color: "#ffffff",
                  opacity: 0.15,
                  distance: 150,
                },
              },
            }}
          />
        </div>

        <main className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-md">
                Laporan & Analisis
              </h1>
              <p className="text-white/80 mt-2 text-lg drop-shadow-sm">
                Verifikasi laporan sesi dan pantau aktivitas.
              </p>
            </div>
            <Link
              href="/dashboard/admin"
              className="hidden sm:inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold text-sm transition-colors duration-200"
            >
              <Icon
                path="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                className="w-5 h-5"
              />
              Kembali ke Dashboard
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {isLoading ? (
              <>
                {" "}
                <StatCardSkeleton /> <StatCardSkeleton />{" "}
              </>
            ) : (
              <>
                <StatCard
                  title="Laporan Diverifikasi"
                  value={verifiedCount}
                  subTitle={
                    lastResetDate
                      ? `Sejak ${format(
                          new Date(lastResetDate),
                          "d MMM yyyy, HH:mm",
                          { locale: id }
                        )}`
                      : "Menghitung..."
                  }
                  iconPath="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  colorClass="text-green-600"
                  iconBgClass="bg-green-100"
                  onReset={handleResetCount}
                  isLoadingReset={isLoadingReset}
                />
                <StatCard
                  title="Laporan Menunggu Verifikasi"
                  value={reportsData.pendingCount}
                  iconPath="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  colorClass="text-amber-600"
                  iconBgClass="bg-amber-100"
                />
              </>
            )}
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-slate-800 shrink-0">
                Manajemen Laporan Sesi
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full sm:w-auto">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Icon
                      path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      className="h-5 w-5 text-slate-400"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari mentor atau siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 rounded-lg border-slate-300 shadow-sm pl-10 placeholder:text-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 sm:text-sm px-4 py-2 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
                  {["pending", "verified", "all"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`flex-1 capitalize text-center px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                        filterStatus === status
                          ? "bg-white text-orange-600 shadow-md"
                          : "text-slate-600 hover:bg-slate-200/70"
                      }`}
                    >
                      {status === "pending"
                        ? "Menunggu"
                        : status === "verified"
                        ? "Terverifikasi"
                        : "Semua"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`transition-all duration-300 ease-in-out ${
                selectedReports.length > 0
                  ? "max-h-40 opacity-100 mb-4"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-center bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-sm font-semibold text-orange-800">
                  {selectedReports.length} laporan terpilih
                </p>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <button
                    onClick={() => setSelectedReports([])}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleHideSelected}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors shadow-sm hover:shadow-red-400/50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="p-4 w-12">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={
                          reports.length > 0 &&
                          selectedReports.length === reports.length
                        }
                        className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                    </th>
                    {["Siswa", "Mentor", "Tanggal Sesi", "Status", "Aksi"].map(
                      (header) => (
                        <th
                          key={header}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {isLoading ? (
                    <ReportTableSkeleton />
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <EmptyState message="Tidak ada laporan untuk ditampilkan." />
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr
                        key={r.report_id}
                        className={`transition-colors duration-200 ${
                          selectedReports.includes(r.report_id)
                            ? "bg-orange-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedReports.includes(r.report_id)}
                            onChange={(e) => handleSelectOne(e, r.report_id)}
                            className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {r.student_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {r.mentor_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {format(
                            new Date(r.session_datetime),
                            "d MMM yyyy, HH:mm",
                            { locale: id }
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full ${
                              r.verified_by_admin
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {r.verified_by_admin ? "Terverifikasi" : "Menunggu"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleViewReport(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-all shadow-sm"
                          >
                            <Icon
                              path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              className="w-4 h-4"
                            />
                            Lihat
                          </button>
                          {!r.verified_by_admin && (
                            <button
                              onClick={() => handleVerify(r.report_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-transparent text-white bg-green-600 rounded-md hover:bg-green-700 transition-all shadow-sm"
                            >
                              <Icon
                                path="M9 12.75L11.25 15 15 9.75"
                                className="w-4 h-4"
                              />
                              Verifikasi
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
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
                  disabled={currentPage >= totalPages || totalPages === 0}
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
        </main>
      </div>
    </div>
  );
}
