"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// Opsi untuk Partikel Latar Belakang
const particlesOptions = {
  fullScreen: { enable: false },
  background: { color: { value: "transparent" } },
  fpsLimit: 120,
  particles: {
    number: { value: 30, density: { enable: true, area: 800 } },
    color: { value: "#ffffff" },
    shape: { type: "circle" },
    opacity: { value: 0.2 },
    size: { value: { min: 1, max: 3 } },
    links: {
      color: "#ffffff",
      distance: 150,
      enable: true,
      opacity: 0.1,
      width: 1,
    },
    move: {
      enable: true,
      speed: 0.5,
      direction: "none",
      outModes: { default: "bounce" },
    },
  },
  detectRetina: true,
};

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
const LoadingSpinner = ({ text }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <svg
      className="animate-spin h-10 w-10 text-orange-500"
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
    <p className="mt-4 text-lg font-medium text-gray-700">{text}</p>
  </div>
);

const EmptyState = ({ message, buttonText, buttonLink }) => (
  <div className="text-center p-10 bg-white rounded-2xl shadow-lg">
    <Icon
      path="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.12-1.588H6.88a2.25 2.25 0 00-2.12 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z"
      className="mx-auto h-16 w-16 text-gray-300"
    />
    <p className="mt-4 font-semibold text-gray-700">{message}</p>
    <Link
      href={buttonLink}
      className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-orange-600 bg-orange-50 rounded-md shadow-sm hover:bg-orange-100"
    >
      <Icon
        path="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25V7.5"
        className="w-5 h-5"
      />
      {buttonText}
    </Link>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    finished: "bg-blue-100 text-blue-800",
    expired: "bg-red-100 text-red-800",
  };
  const statusText = {
    active: "Aktif",
    pending: "Menunggu Verifikasi",
    finished: "Selesai",
    expired: "Kedaluwarsa",
  };
  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {statusText[status] || status}
    </span>
  );
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  return format(new Date(dateString), "dd MMM yyyy", { locale: id });
};

const TableSkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-4">
      <div className="h-5 w-5 bg-gray-200 rounded"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
    </td>
  </tr>
);

export default function PackageHistoryPage() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackages, setSelectedPackages] = useState([]);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Anda harus login.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await axios.get("/api/student/my-packages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPackages(response.data);
      setSelectedPackages([]);
    } catch (err) {
      toast.error("Gagal memuat riwayat paket.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleSelectOne = (e, packageId) => {
    if (e.target.checked) {
      setSelectedPackages((prev) => [...prev, packageId]);
    } else {
      setSelectedPackages((prev) => prev.filter((id) => id !== packageId));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allPackageIds = packages.map((pkg) => pkg.user_package_id);
      setSelectedPackages(allPackageIds);
    } else {
      setSelectedPackages([]);
    }
  };

  const handleBulkHide = async () => {
    if (selectedPackages.length === 0) {
      toast.warn("Pilih setidaknya satu riwayat untuk disembunyikan.");
      return;
    }
    if (
      !window.confirm(
        `Yakin ingin menyembunyikan ${selectedPackages.length} riwayat paket terpilih?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    try {
      const response = await axios.put(
        "/api/student/my-packages/hide-bulk",
        { userPackageIds: selectedPackages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      fetchPackages();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gagal menyembunyikan riwayat."
      );
    }
  };

  if (isLoading && packages.length === 0)
    return <LoadingSpinner text="Memuat riwayat paket..." />;

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

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href="/dashboard/siswa"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors text-sm"
            >
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
              Kembali ke Dashboard
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Riwayat Paket Bimbel
              </h1>
              <p className="text-white/80 mt-1">
                Lihat semua paket yang pernah Anda beli atau yang sedang aktif.
              </p>
            </div>
            {selectedPackages.length > 0 && (
              <button
                onClick={handleBulkHide}
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
              >
                <Icon
                  path="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  className="w-4 h-4"
                />
                Hapus ({selectedPackages.length})
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {packages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 w-4">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={
                            packages.length > 0 &&
                            selectedPackages.length === packages.length
                          }
                          className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Paket
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tgl. Pembelian
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Masa Aktif
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progres Sesi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading
                      ? Array.from({ length: 3 }).map((_, i) => (
                          <TableSkeletonRow key={i} />
                        ))
                      : packages.map((pkg) => (
                          <tr
                            key={pkg.user_package_id}
                            className={`hover:bg-gray-50 transition-colors ${
                              selectedPackages.includes(pkg.user_package_id)
                                ? "bg-orange-50"
                                : ""
                            }`}
                          >
                            <td className="p-4">
                              <input
                                type="checkbox"
                                checked={selectedPackages.includes(
                                  pkg.user_package_id
                                )}
                                onChange={(e) =>
                                  handleSelectOne(e, pkg.user_package_id)
                                }
                                className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                              {pkg.package_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(pkg.purchase_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(pkg.activation_date)} -{" "}
                              {formatDate(pkg.expiry_date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                              {pkg.used_sessions ?? 0} /{" "}
                              {pkg.total_sessions ?? 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={pkg.status} />
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                message="Anda belum pernah membeli paket bimbel."
                buttonText="Lihat Pilihan Paket"
                buttonLink="/dashboard/siswa/packages"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
