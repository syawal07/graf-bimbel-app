"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";

const Particles = dynamic(() => import("react-tsparticles"), {
  ssr: false,
});

//=================================================================
// KUMPULAN KOMPONEN KECIL (UI Components)
//=================================================================

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

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-slate-600">Memuat data...</p>
  </div>
);

const AdvantageCard = ({ icon_svg, title, description }) => (
  <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-2 text-center">
    <div className="flex justify-center mb-4">
      <div
        className="text-orange-500 bg-orange-100 rounded-full p-4 flex justify-center items-center h-20 w-20"
        dangerouslySetInnerHTML={{
          __html:
            icon_svg ||
            '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6-2.292m0-14.25v14.25" /></svg>',
        }}
      />
    </div>
    <h3 className="text-xl font-semibold text-slate-800 mb-3">{title}</h3>
    <p className="text-slate-600">{description}</p>
  </div>
);

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-white p-6 rounded-xl shadow-md transition-all duration-300 hover:shadow-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full text-left focus:outline-none"
      >
        <span className="text-lg font-semibold text-orange-600">
          {question}
        </span>
        <Icon
          path={
            isOpen
              ? "M4.5 15.75l7.5-7.5 7.5 7.5"
              : "M19.5 8.25l-7.5 7.5-7.5-7.5"
          }
          className={`w-6 h-6 text-orange-500 transform transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div
          className="mt-4 text-slate-700 prose"
          dangerouslySetInnerHTML={{ __html: answer }}
        ></div>
      )}
    </div>
  );
};

//=================================================================
// KUMPULAN KOMPONEN SECTION HALAMAN
//=================================================================

const Header = ({ logoUrl, registrationUrl, navLinks }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm py-4 px-6 fixed w-full z-50 top-0">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src={logoUrl}
            alt="Logo Graf Bimbel"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.src = "/assets/img/hero/10.jpg";
            }}
            priority
          />
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-slate-700 hover:text-orange-600 font-medium transition duration-300"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 transform hover:scale-105"
          >
            Daftar Sekarang
          </a>
          <Link
            href="/login"
            className="text-orange-600 hover:text-orange-700 font-semibold py-2 px-5 rounded-lg border border-orange-600 hover:border-orange-700 transition duration-300"
          >
            Login
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-slate-600 hover:text-orange-600 focus:outline-none"
          >
            <Icon
              path={
                isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"
              }
              className="w-6 h-6"
            />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 space-y-2 px-6 pb-6 bg-white shadow-md rounded-b-lg">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-slate-700 hover:text-orange-600"
            >
              {link.label}
            </a>
          ))}
          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMenuOpen(false)}
            className="block text-center bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition duration-300 mt-4"
          >
            Daftar Sekarang
          </a>
          <Link
            href="/login"
            onClick={() => setIsMenuOpen(false)}
            className="block text-center text-orange-600 hover:text-orange-700 font-semibold py-2 px-5 rounded-lg border border-orange-600 hover:border-orange-700 transition duration-300"
          >
            Login
          </Link>
        </div>
      )}
    </header>
  );
};

const HeroSection = ({ slides, isLoading }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const handleNext = useCallback(() => {
    if (slides.length === 0) return;
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = () => {
    if (slides.length === 0) return;
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (slides.length > 1) {
      const timer = setInterval(() => {
        handleNext();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [slides.length, handleNext]);

  const currentSlide = slides[currentSlideIndex];

  if (isLoading || !currentSlide) {
    return (
      <section
        id="home"
        className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-white h-[80vh] flex items-center justify-center"
      >
        <p>Memuat Hero Section...</p>
      </section>
    );
  }

  return (
    <section
      id="home"
      className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-white pt-32 pb-24 md:pt-40 md:pb-32 overflow-hidden"
    >
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          fullScreen: { enable: false },
          background: { color: "transparent" },
          particles: {
            number: { value: 50 },
            color: { value: "#ffffff" },
            opacity: { value: 0.3 },
            size: { value: { min: 1, max: 3 } },
            move: { enable: true, speed: 1 },
            links: {
              enable: true,
              color: "#ffffff",
              opacity: 0.2,
              distance: 150,
            },
          },
        }}
        className="absolute inset-0 z-0"
      />
      <div className="container relative z-10 mx-auto px-8 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="md:w-1/2 text-center md:text-left space-y-6 max-w-2xl">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white drop-shadow-md"
            dangerouslySetInnerHTML={{ __html: currentSlide.title }}
          ></h1>
          <p className="text-lg md:text-xl text-white opacity-90 leading-relaxed drop-shadow-sm">
            {currentSlide.subtitle}
          </p>
          {currentSlide.cta_text && currentSlide.cta_url && (
            <a
              href={
                currentSlide.cta_url.startsWith("http")
                  ? currentSlide.cta_url
                  : `/${currentSlide.cta_url}`
              }
              target={
                currentSlide.cta_url.startsWith("http") ? "_blank" : "_self"
              }
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-yellow-400 font-bold py-4 px-10 rounded-full shadow-lg transition duration-300 transform hover:scale-110 hover:shadow-2xl text-lg"
            >
              {currentSlide.cta_text}
            </a>
          )}
        </div>
        <div className="w-full md:w-1/2 relative h-72 md:h-[28rem] overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/20">
          {slides.map((slide, index) => {
            const mediaUrl = `/${slide.media_url.replace(/^\/*/, "")}`;

            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === currentSlideIndex ? "opacity-100" : "opacity-0"
                }`}
              >
                {slide.media_type === "video" ? (
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-contain"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <Image
                      src={mediaUrl}
                      alt={slide.title}
                      layout="fill"
                      objectFit="contain" // Menggunakan object-contain untuk menghindari pemotongan
                      priority={index === 0}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition z-10"
          >
            <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition z-10"
          >
            <Icon path="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = ({ advantages, isLoading }) => (
  <section id="features" className="py-16 md:py-24 bg-slate-50">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
        Mengapa Kami Pilihan Terbaik?
      </h2>
      <p className="text-slate-600 mb-12 max-w-2xl mx-auto">
        Kami menyediakan platform belajar yang lengkap dengan berbagai
        keunggulan untuk mendukung kesuksesan akademik Anda.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="lg:col-span-3 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          advantages.map((adv) => <AdvantageCard key={adv.id} {...adv} />)
        )}
      </div>
    </div>
  </section>
);

const PackagesSection = ({ packages, isLoading }) => (
  <section id="packages" className="py-16 md:py-24 bg-white">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-orange-700 mb-12">
        Pilih Paket Belajarmu Sesuai Kebutuhan
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="lg:col-span-3 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          packages.map((pkg) => (
            <div
              key={pkg.package_id}
              className="bg-slate-50 p-8 rounded-xl shadow-lg border-t-4 border-orange-600 flex flex-col justify-between text-left transform hover:-translate-y-2 transition-transform duration-300"
            >
              <div>
                <h3 className="text-2xl font-bold text-orange-700 mb-2 text-center">
                  {pkg.package_name}
                </h3>
                <p className="text-center text-slate-500 mb-6 min-h-[40px]">
                  {pkg.description || "Deskripsi tidak tersedia."}
                </p>
                <div className="text-4xl font-extrabold text-slate-800 mb-6 text-center">
                  Rp {new Intl.NumberFormat("id-ID").format(pkg.price)}
                  <span className="text-xl text-slate-500 font-medium">
                    / {pkg.duration_days} hari
                  </span>
                </div>
                <ul className="text-slate-700 space-y-3 mb-8">
                  <li className="flex items-center">
                    <Icon
                      path="M9 12.75L11.25 15 15 9.75"
                      className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                    />
                    <span>{pkg.total_sessions} Sesi Pertemuan</span>
                  </li>
                  <li className="flex items-center">
                    <Icon
                      path="M9 12.75L11.25 15 15 9.75"
                      className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
                    />
                    <span>Kurikulum {pkg.curriculum}</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/login"
                className="block text-center bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 transform hover:scale-105"
              >
                Pilih Paket Ini
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  </section>
);

const FaqSection = ({ faqs, isLoading }) => (
  <section id="faq" className="py-16 md:py-24 bg-slate-50">
    <div className="container mx-auto px-6 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-12">
        Pertanyaan yang Sering Diajukan
      </h2>
      <div className="max-w-3xl mx-auto space-y-4 text-left">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          faqs.map((faq) => <FaqItem key={faq.id} {...faq} />)
        )}
      </div>
    </div>
  </section>
);

const CtaSection = ({ registrationUrl }) => (
  <section className="py-16 md:py-24 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-center">
    <div className="container mx-auto px-6">
      <h2 className="text-3xl md:text-4xl font-bold mb-6">
        Siap untuk Belajar Lebih Baik?
      </h2>
      <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
        Jangan tunda lagi! Raih prestasi akademik impianmu bersama Graf Bimbel.
      </p>
      <a
        href={registrationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-white hover:bg-slate-100 text-orange-600 font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105 text-lg"
      >
        Daftar Sekarang Juga!
      </a>
    </div>
  </section>
);

const Footer = ({ siteSettings, logoUrl, navLinks }) => (
  <footer id="contact" className="bg-slate-900 text-slate-300">
    <div className="container mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* About */}
        <div>
          <Link href="/" className="mb-4 inline-block">
            <Image
              src={logoUrl}
              alt="Logo Graf Bimbel"
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.src = "/assets/img/hero/10.jpg";
              }}
            />
          </Link>
          <p className="text-slate-400 text-sm">
            {siteSettings.footer_about ||
              "Partner terpercaya untuk meraih prestasi akademik..."}
          </p>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="font-semibold mb-4 text-white">Navigasi</h4>
          <ul className="space-y-2 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-slate-400 hover:text-yellow-400"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a href="/login" className="text-slate-400 hover:text-yellow-400">
                Login Siswa
              </a>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-4 text-white">Hubungi Kami</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              Email: {siteSettings.contact_email || "support@grafbimbel.com"}
            </li>
            <li>Telepon: {siteSettings.contact_phone || "(021) 123-4567"}</li>
            <li>
              Alamat:{" "}
              {siteSettings.contact_address ||
                "Jl. Pendidikan No. 123, Jakarta Selatan"}
            </li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h4 className="font-semibold mb-4 text-white">Ikuti Kami</h4>
          <div className="flex space-x-4">
            <a
              href={siteSettings.social_facebook_url || "#"}
              className="text-slate-400 hover:text-yellow-400"
            >
              <Icon path="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
            </a>
            <a
              href={siteSettings.social_twitter_url || "#"}
              className="text-slate-400 hover:text-yellow-400"
            >
              <Icon path="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
            </a>
            <a
              href={siteSettings.social_instagram_url || "#"}
              className="text-slate-400 hover:text-yellow-400"
            >
              <Icon
                path="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.024.06 1.378.06 3.808s-.012 2.784-.06 3.808c-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.024.048-1.378.06-3.808.06s-2.784-.013-3.808-.06c-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.378-.06-3.808s.012-2.784.06-3.808c.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.345 2.525c.636-.247 1.363-.416 2.427-.465C9.793 2.013 10.147 2 12.315 2zm-1.161 2.043c-1.049.045-1.71.21-2.225.41a3.023 3.023 0 00-1.14 1.14c-.199.515-.365 1.176-.41 2.225-.045 1.02-.056 1.355-.056 3.173s.011 2.153.056 3.173c.045 1.049.21 1.71.41 2.225a3.023 3.023 0 001.14 1.14c.515.199 1.176.365 2.225.41 1.02.045 1.355.056 3.173.056s2.153-.011 3.173-.056c1.049-.045 1.71-.21 2.225-.41a3.023 3.023 0 001.14 1.14c.199-.515.365-1.176.41-2.225.045-1.02.056-1.355-.056-3.173s-.011-2.153-.056-3.173c-.045-1.049-.21-1.71-.41-2.225a3.023 3.023 0 00-1.14-1.14c-.515-.199-1.176-.365-2.225-.41-1.02-.045-1.355-.056-3.173-.056s-2.153.011-3.173.056zM12 6.845a5.155 5.155 0 100 10.31 5.155 5.155 0 000-10.31zm0 8.312a3.157 3.157 0 110-6.314 3.157 3.157 0 010 6.314zM18.305 5.79a1.237 1.237 0 100 2.475 1.237 1.237 0 000-2.475z"
                clipRule="evenodd"
              />
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-slate-800 pt-6">
        <p className="text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Graf Bimbel. Semua Hak Cipta
          Dilindungi.
        </p>
      </div>
    </div>
  </footer>
);

//=================================================================
// KOMPONEN UTAMA HALAMAN (Main Page Component)
//=================================================================

const navLinks = [
  { href: "#home", label: "Beranda" },
  { href: "#features", label: "Keunggulan" },
  { href: "#packages", label: "Paket Bimbel" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Kontak" },
];

export default function HomePage() {
  const [heroSlides, setHeroSlides] = useState([]);
  const [publicPackages, setPublicPackages] = useState([]);
  const [advantages, setAdvantages] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [siteSettings, setSiteSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchPublicData = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoints = [
        "/api/public/packages",
        "/api/public/advantages",
        "/api/public/faqs",
        "/api/public/hero-slides",
        "/api/public/settings",
      ];
      const requests = endpoints.map((url) => axios.get(url));
      const [packagesRes, advantagesRes, faqsRes, slidesRes, settingsRes] =
        await Promise.all(requests);

      setPublicPackages(packagesRes.data);
      setAdvantages(advantagesRes.data);
      setFaqs(faqsRes.data);
      setHeroSlides(slidesRes.data);
      setSiteSettings(settingsRes.data);
    } catch (error) {
      console.error("Gagal memuat data publik:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicData();
  }, [fetchPublicData]);

  const logoUrl = siteSettings.logo_url
    ? `/${siteSettings.logo_url.replace(/^\/*/, "")}`
    : "/assets/img/hero/10.jpg";
  const registrationUrl =
    siteSettings.registration_url || "https://forms.gle/Qwmn94ZUniCfKyn1A";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="text-slate-800 font-sans bg-white">
      <Header
        logoUrl={logoUrl}
        registrationUrl={registrationUrl}
        navLinks={navLinks}
      />
      <main>
        <HeroSection slides={heroSlides} isLoading={isLoading} />
        <FeaturesSection advantages={advantages} isLoading={isLoading} />
        <PackagesSection packages={publicPackages} isLoading={isLoading} />
        <FaqSection faqs={faqs} isLoading={isLoading} />
        <CtaSection registrationUrl={registrationUrl} />
      </main>
      <Footer
        siteSettings={siteSettings}
        logoUrl={logoUrl}
        navLinks={navLinks.slice(0, 3)}
      />
    </div>
  );
}
