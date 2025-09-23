"use client";

import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// Helper function untuk memastikan path media selalu benar
const getSafeImagePath = (path) => {
  if (!path) return "/assets/img/hero/10.jpg"; // Fallback jika path kosong
  if (path.startsWith("blob:")) return path;
  return `/${path.replace(/^\/+/, "")}`;
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

// Komponen Input Field
const InputField = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  iconPath,
  required = false,
  autoComplete,
}) => (
  <div className="space-y-2">
    <label htmlFor={name} className="text-sm font-medium text-gray-700">
      {label}
    </label>
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Icon path={iconPath} className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="block w-full rounded-lg border-gray-300 py-2.5 pl-10 pr-4 text-black shadow-sm placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
      />
    </div>
  </div>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // [DIUBAH] Menggunakan satu state untuk semua pengaturan
  const [siteSettings, setSiteSettings] = useState({});

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  // [DIUBAH] useEffect untuk mengambil semua pengaturan situs sekaligus
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get("/api/public/settings");
        if (response.data) {
          setSiteSettings(response.data);
        }
      } catch (error) {
        console.error("Gagal memuat pengaturan situs:", error);
      }
    };
    fetchSettings();
  }, []); // Array kosong memastikan ini hanya berjalan sekali

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warn("Email dan password wajib diisi.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      toast.success("Login berhasil! Mengarahkan ke dashboard...");
      setTimeout(() => {
        if (user.role === "admin") {
          router.push("/dashboard/admin");
        } else if (user.role === "mentor") {
          router.push("/dashboard/mentor");
        } else {
          router.push("/dashboard/siswa");
        }
      }, 1500);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi."
      );
      setIsSubmitting(false);
    }
  };

  const logoUrl = siteSettings.logo_url
    ? getSafeImagePath(siteSettings.logo_url)
    : "/assets/img/hero/10.jpg";
  const registrationUrl =
    siteSettings.registration_url || "https://forms.gle/Qwmn94ZUniCfKyn1A";

  return (
    <>
      <ToastContainer position="top-center" theme="colored" />
      <div className="relative flex items-center justify-center min-h-screen bg-gray-100 overflow-hidden p-4">
        <div className="absolute inset-0 z-0 w-full h-full bg-gradient-to-r from-yellow-400 to-orange-500">
          <Particles
            id="tsparticles"
            init={particlesInit}
            options={{
              fullScreen: { enable: true, zIndex: -1 },
              background: { color: { value: "transparent" } },
              particles: {
                number: { value: 50 },
                color: { value: "#ffffff" },
                opacity: { value: 0.2 },
                size: { value: { min: 1, max: 4 } },
                move: { enable: true, speed: 1 },
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

        <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl">
          <div className="text-center">
            {/* [DIUBAH] Logo sekarang dinamis dan tanpa card/hover effect */}
            <Image
              src={logoUrl}
              alt="Logo Graf Bimbel"
              width={100}
              height={100}
              className="mx-auto object-contain"
              priority
              onError={(e) => {
                e.currentTarget.src = "/assets/img/hero/10.jpg";
              }}
            />
            {/* [DIUBAH] Teks judul dan sub-judul sekarang dinamis */}
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              {siteSettings.login_title || "Graf-Bimbel"}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {siteSettings.login_subtitle ||
                "Platform Bimbingan Belajar Terpercaya"}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <InputField
              label="Alamat Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cth: grafbimbel@gmail.com"
              iconPath="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              required
              autoComplete="email"
            />
            <InputField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password Anda"
              iconPath="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              required
              autoComplete="current-password"
            />
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting && (
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                {isSubmitting ? "Memproses..." : "Login"}
              </button>
            </div>
          </form>

          <p className="text-sm text-center text-gray-600">
            Belum punya akun?{" "}
            <a
              href={registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              Daftar di sini
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
