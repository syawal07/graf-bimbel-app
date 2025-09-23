"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

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

// --- [KOMPONEN] Skeleton Loading ---
const PackageCardSkeleton = () => (
  <div className="bg-white rounded-3xl shadow-lg p-6 animate-pulse space-y-4">
    <div className="h-5 bg-slate-200 rounded w-1/3"></div>
    <div className="h-8 bg-slate-300 rounded w-2/3"></div>
    <div className="h-10 bg-slate-300 rounded w-1/2 mt-4"></div>
    <div className="h-4 bg-slate-200 rounded w-full mt-2"></div>
    <div className="pt-4 space-y-3">
      <div className="h-5 bg-slate-200 rounded w-4/5"></div>
      <div className="h-5 bg-slate-200 rounded w-3/5"></div>
    </div>
    <div className="h-12 bg-slate-200 rounded-xl mt-4"></div>
  </div>
);

const PageSkeleton = () => (
  <div className="relative z-10 p-4 sm:p-6 lg:p-8">
    <div className="max-w-7xl mx-auto">
      <div className="h-6 bg-white/30 rounded-lg w-48 mb-12"></div>
      <div className="text-center mb-12">
        <div className="h-9 md:h-11 bg-white/30 rounded-lg w-1/2 mx-auto"></div>
        <div className="h-4 bg-white/20 rounded-lg max-w-2xl mx-auto mt-4"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <PackageCardSkeleton />
        <PackageCardSkeleton />
        <PackageCardSkeleton />
      </div>
    </div>
  </div>
);

// --- [KOMPONEN] Empty State ---
const EmptyState = ({ message, buttonText, buttonLink }) => (
  <div className="text-center p-12 bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50">
    <Icon
      path="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      className="mx-auto h-20 w-20 text-slate-300"
    />
    <p className="mt-5 text-xl font-semibold text-slate-700">{message}</p>
    <p className="mt-2 text-sm text-slate-500">
      Silakan cek kembali nanti atau hubungi admin jika ada pertanyaan.
    </p>
    <Link
      href={buttonLink}
      className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-white bg-orange-500 rounded-xl hover:bg-orange-600 font-semibold transition-all shadow-lg hover:shadow-orange-300 text-sm"
    >
      <Icon path="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" className="w-5 h-5" />
      {buttonText}
    </Link>
  </div>
);

export default function PurchasePackagePage() {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const particlesInit = useCallback(
    async (engine) => await loadSlim(engine),
    []
  );

  useEffect(() => {
    const fetchPackages = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get("/api/public/packages", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPackages(response.data);
      } catch (err) {
        toast.error("Gagal memuat daftar paket.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const handlePurchase = (pkg) => {
    router.push(`/dashboard/siswa/packages/${pkg.package_id}/confirm`);
  };

  // Menandai paket yang paling populer (misalnya, yang kedua)
  const popularPackageId = packages.length > 1 ? packages[1].package_id : null;

  return (
    <div className="relative bg-slate-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" autoClose={3000} />
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

      {isLoading ? (
        <PageSkeleton />
      ) : (
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Link
                href="/dashboard/siswa"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors text-sm"
              >
                <Icon
                  path="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  className="w-5 h-5"
                />
                Kembali ke Dashboard
              </Link>
            </div>

            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-md">
                Beli atau Perpanjang Paket
              </h1>
              <p className="text-white/80 mt-3 max-w-2xl mx-auto text-lg">
                Pilih paket belajar yang paling sesuai dengan kebutuhan dan
                target akademis Anda.
              </p>
            </div>

            {packages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                {packages.map((pkg) => {
                  const isPopular = pkg.package_id === popularPackageId;
                  return (
                    <div
                      key={pkg.package_id}
                      className={`relative bg-white rounded-3xl shadow-lg flex flex-col transition-all duration-300 border ${
                        isPopular
                          ? "scale-105 shadow-2xl border-orange-500 border-2"
                          : "hover:-translate-y-2 border-slate-200/50"
                      }`}
                    >
                      {isPopular && (
                        <p className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                          PALING POPULER
                        </p>
                      )}
                      <div className="p-8 text-center border-b border-slate-200">
                        <p className="text-sm text-orange-600 uppercase font-bold tracking-wider">
                          {pkg.curriculum}
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 mt-2">
                          {pkg.package_name}
                        </h2>
                      </div>

                      <div className="p-8 flex-grow">
                        <div className="text-center">
                          <span className="text-4xl font-extrabold text-slate-800">
                            Rp{" "}
                            {new Intl.NumberFormat("id-ID").format(pkg.price)}
                          </span>
                          <span className="text-slate-500 font-medium">
                            {" "}
                            / paket
                          </span>
                        </div>
                        <p className="text-slate-600 my-6 text-sm text-center">
                          {pkg.description}
                        </p>

                        <ul className="text-sm space-y-4 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <li className="flex items-center gap-3">
                            <Icon
                              path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              className="w-5 h-5 text-green-500 shrink-0"
                            />
                            <span>
                              <strong className="text-slate-800">
                                {pkg.total_sessions} Sesi
                              </strong>{" "}
                              Pertemuan Privat
                            </span>
                          </li>
                          <li className="flex items-center gap-3">
                            <Icon
                              path="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              className="w-5 h-5 text-green-500 shrink-0"
                            />
                            <span>
                              Masa Aktif{" "}
                              <strong className="text-slate-800">
                                {pkg.duration_days} Hari
                              </strong>
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-6 mt-auto">
                        <button
                          onClick={() => handlePurchase(pkg)}
                          className={`w-full font-bold py-3.5 rounded-xl transition-all duration-300 text-base ${
                            isPopular
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl hover:shadow-orange-300/50"
                              : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          }`}
                        >
                          Pilih & Lanjutkan
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                message="Saat ini belum ada paket yang tersedia."
                buttonText="Kembali ke Dashboard"
                buttonLink="/dashboard/siswa"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
