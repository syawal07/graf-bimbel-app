"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// Helper function untuk memastikan path media selalu benar
const getSafeImagePath = (path) => {
  if (!path) return "https://placehold.co/100x30?text=Logo";
  if (path.startsWith("blob:")) return path;
  return `/${path.replace(/^\/+/, "")}`;
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

// --- Komponen UI Tambahan ---
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
      path="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      className="mx-auto h-16 w-16 text-gray-300"
    />
    <p className="mt-4 font-semibold text-gray-700">{message}</p>
    <p className="mt-1 text-sm text-gray-500">
      Paket mungkin tidak lagi tersedia atau terjadi kesalahan.
    </p>
    <Link
      href={buttonLink}
      className="mt-6 inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 font-semibold transition-colors text-sm"
    >
      <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
      {buttonText}
    </Link>
  </div>
);

const StepDivider = ({ number, title }) => (
  <div className="relative my-8">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-gray-200" />
    </div>
    <div className="relative flex items-center gap-3">
      <span className="bg-white pr-2 text-sm font-semibold text-orange-600">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-orange-500 bg-orange-50">
          {number}
        </span>
      </span>
      <span className="bg-white pl-2 text-lg font-bold text-gray-800">
        {title}
      </span>
    </div>
  </div>
);

export default function ConfirmPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const { package_id } = params;

  const [pkg, setPkg] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]); // State baru untuk rekening
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyStatus, setCopyStatus] = useState({});

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    if (package_id) {
      const fetchInitialData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem("token");
        try {
          // Mengambil detail paket dan metode pembayaran secara bersamaan
          const packagePromise = axios.get(
            `/api/public/packages/${package_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const paymentMethodsPromise = axios.get(
            "/api/public/payment-methods"
          );

          const [packageResponse, paymentMethodsResponse] = await Promise.all([
            packagePromise,
            paymentMethodsPromise,
          ]);

          setPkg(packageResponse.data);
          setPaymentMethods(paymentMethodsResponse.data);
        } catch (err) {
          toast.error("Gagal memuat detail paket atau metode pembayaran.");
          setPkg(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitialData();
    }
  }, [package_id]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleCopy = (textToCopy, id) => {
    navigator.clipboard.writeText(textToCopy.replace(/-/g, "")); // Salin tanpa tanda hubung
    setCopyStatus({ [id]: true });
    setTimeout(() => setCopyStatus({ [id]: false }), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pkg || !file) {
      toast.warn("Harap lengkapi semua data sebelum mengirim.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("package_id", package_id);
    formData.append("paymentProof", file);

    const token = localStorage.getItem("token");
    try {
      const response = await axios.post(
        "/api/student/purchase-request",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success(response.data.message);
      setTimeout(() => router.push("/dashboard/siswa"), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengirim konfirmasi.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner text="Memuat detail paket..." />;

  return (
    <div className="relative bg-gray-50 min-h-screen">
      <ToastContainer position="top-center" theme="colored" />
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-r from-yellow-400 to-orange-500">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            particles: {
              number: { value: 30 },
              color: { value: "#ffffff" },
              opacity: { value: 0.2 },
              size: { value: { min: 1, max: 3 } },
              move: { enable: true, speed: 0.5 },
              links: {
                enable: true,
                color: "#ffffff",
                opacity: 0.1,
                distance: 150,
              },
            },
          }}
        />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              href="/dashboard/siswa/packages"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold transition-colors text-sm"
            >
              <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />{" "}
              Kembali Pilih Paket
            </Link>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
            {!pkg ? (
              <EmptyState
                message="Detail paket tidak ditemukan."
                buttonText="Kembali Pilih Paket"
                buttonLink="/dashboard/siswa/packages"
              />
            ) : (
              <>
                <div className="mb-6 pb-4 border-b">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Konfirmasi Pembayaran
                  </h1>
                  <p className="text-gray-600 mt-2 text-sm">
                    Selesaikan 3 langkah mudah di bawah ini untuk mengaktifkan
                    paket Anda.
                  </p>
                </div>

                <StepDivider number="1" title="Ringkasan Pesanan" />
                <div className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800">
                      {pkg.package_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {pkg.total_sessions} Sesi / {pkg.duration_days} Hari
                    </p>
                  </div>
                  <p className="font-bold text-lg text-orange-600">
                    Rp {new Intl.NumberFormat("id-ID").format(pkg.price)}
                  </p>
                </div>

                <StepDivider number="2" title="Lakukan Transfer" />
                <div className="space-y-4">
                  {/* --- [DIUBAH] Bagian Rekening Bank Dinamis --- */}
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <Image
                            src={getSafeImagePath(method.logo_url)}
                            alt={method.bank_name}
                            width={80}
                            height={25}
                            className="h-7 w-auto object-contain"
                          />
                          <div>
                            <p className="font-mono text-base sm:text-lg text-gray-800">
                              {method.account_number}
                            </p>
                            <p className="text-sm font-sans text-gray-500">
                              (a.n. {method.account_holder_name})
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleCopy(method.account_number, method.id)
                          }
                          className="flex items-center gap-2 text-sm bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1.5 rounded-md font-semibold transition-colors"
                        >
                          <Icon
                            path="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M12 14.25a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m9 16.5A2.25 2.25 0 0019.5 21h.625a2.25 2.25 0 002.25-2.25V15m-3 0V9"
                            className="w-4 h-4"
                          />
                          {copyStatus[method.id] ? "Tersalin!" : "Salin"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-sm text-gray-500 p-4">
                      Metode pembayaran belum tersedia. Silakan hubungi admin.
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit}>
                  <StepDivider number="3" title="Unggah Bukti & Selesaikan" />
                  <label
                    htmlFor="paymentProof"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500"
                  >
                    <div className="flex items-center gap-4 px-4 py-6 border-2 border-dashed rounded-lg">
                      <Icon
                        path="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V6.75A4.5 4.5 0 017.5 2.25h9A4.5 4.5 0 0121 6.75v10.5A4.5 4.5 0 0116.5 21h-9A4.5 4.5 0 013 17.25z"
                        className="w-10 h-10 text-gray-400"
                      />
                      <div>
                        <p className="font-semibold text-orange-600">
                          Klik untuk mengunggah bukti transfer
                        </p>
                        <p className="text-xs text-gray-500">
                          {file ? file.name : "JPG, PNG, atau PDF (maks. 5MB)"}
                        </p>
                      </div>
                    </div>
                    <input
                      id="paymentProof"
                      name="paymentProof"
                      type="file"
                      required
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-6 w-full flex justify-center items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-lg hover:opacity-90 disabled:opacity-50 font-bold shadow-lg"
                    disabled={isSubmitting || isLoading}
                  >
                    {isSubmitting && (
                      <svg
                        className="animate-spin -ml-1 mr-2 h-5 w-5"
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
                    {isSubmitting ? "Mengirim..." : "Saya Sudah Transfer"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
