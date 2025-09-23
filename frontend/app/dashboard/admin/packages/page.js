"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

export default function ManagePackagesPage() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPackages = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Anda harus login.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await axios.get("/api/admin/packages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPackages(response.data);
    } catch (err) {
      setError("Gagal memuat data paket.");
      toast.error("Gagal memuat data paket.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleDelete = async (packageId, packageName) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus paket "${packageName}"?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`/api/admin/packages/${packageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Paket "${packageName}" berhasil dihapus.`);
      fetchPackages(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghapus paket.");
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center bg-gray-100 min-h-screen">
        Memuat data paket...
      </div>
    );
  if (error)
    return (
      <div className="p-8 text-center text-red-500 bg-gray-100 min-h-screen">
        {error}
      </div>
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" />

      {/* --- Header --- */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-2xl shadow-lg mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Manajemen Paket Bimbel
          </h1>
          <p className="text-white/80 mt-1">
            Buat, lihat, dan kelola semua paket pembelajaran yang tersedia.
          </p>
        </div>
        <Link
          href="/dashboard/admin/packages/new"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-orange-600 bg-white rounded-md shadow-sm hover:bg-gray-100"
        >
          <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-5 h-5" />
          Tambah Paket
        </Link>
      </div>

      {packages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.package_id}
              className="bg-white p-6 rounded-2xl shadow-lg flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300"
            >
              <div>
                <p className="text-sm text-orange-500 uppercase font-semibold">
                  {pkg.curriculum}
                </p>
                <h2 className="text-xl font-bold text-gray-900 mt-1">
                  {pkg.package_name}
                </h2>
                <p className="text-gray-600 my-4 text-sm">{pkg.description}</p>

                <div className="text-4xl font-bold text-gray-800 my-4">
                  Rp {new Intl.NumberFormat("id-ID").format(pkg.price)}
                </div>

                <ul className="text-sm space-y-2 text-gray-700 border-t pt-4">
                  <li className="flex items-center gap-3">
                    <Icon
                      path="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      className="w-5 h-5 text-green-500"
                    />
                    <span>{pkg.total_sessions} Sesi Pertemuan</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Icon
                      path="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18"
                      className="w-5 h-5 text-green-500"
                    />
                    <span>Durasi {pkg.duration_days} Hari</span>
                  </li>
                </ul>
              </div>
              <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                <Link
                  href={`/dashboard/admin/packages/${pkg.package_id}/edit`}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(pkg.package_id, pkg.package_name)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center bg-white p-10 rounded-xl shadow-md">
          <Icon
            path="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            className="w-16 h-16 mx-auto text-gray-300"
          />
          <p className="text-gray-500 mt-4 font-semibold">
            Belum ada paket bimbel yang dibuat.
          </p>
        </div>
      )}
    </div>
  );
}
