"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";

// --- Helper function untuk memastikan path media selalu benar ---
const getSafeImagePath = (path) => {
  if (!path) return "https://placehold.co/192x112?text=Media+Tidak+Ada";
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

// --- Komponen UI ---
const StyledInput = (props) => (
  <input
    {...props}
    className={`block w-full rounded-lg border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 shadow-sm transition duration-150 ease-in-out focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 ${
      props.className || ""
    }`}
  />
);

const StyledTextarea = (props) => (
  <textarea
    {...props}
    className={`block w-full rounded-lg border-slate-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 shadow-sm transition duration-150 ease-in-out focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 ${
      props.className || ""
    }`}
  />
);

// --- Komponen Modal untuk Keunggulan & FAQ ---
const ContentModal = ({ item, type, onClose, onSave }) => {
  const [formData, setFormData] = useState(item || {});
  const isAdvantage = type === "advantage";
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-50 p-8 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all"
      >
        <h2 className="text-2xl font-bold text-slate-800">
          {item?.id ? "Edit" : "Tambah"} {isAdvantage ? "Keunggulan" : "FAQ"}
        </h2>
        <div className="mt-6 space-y-5">
          {isAdvantage ? (
            <>
              <StyledInput
                name="title"
                value={formData.title || ""}
                onChange={handleChange}
                placeholder="Judul Keunggulan"
                required
              />
              <StyledTextarea
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                placeholder="Deskripsi Singkat"
                rows="3"
                required
              />
              <StyledTextarea
                name="icon_svg"
                value={formData.icon_svg || ""}
                onChange={handleChange}
                placeholder="Kode SVG Ikon (opsional)"
                className="font-mono text-xs"
                rows="3"
              />
            </>
          ) : (
            <>
              <StyledTextarea
                name="question"
                value={formData.question || ""}
                onChange={handleChange}
                placeholder="Pertanyaan"
                rows="2"
                required
              />
              <StyledTextarea
                name="answer"
                value={formData.answer || ""}
                onChange={handleChange}
                placeholder="Jawaban"
                rows="4"
                required
              />
            </>
          )}
        </div>
        <div className="flex justify-end items-center gap-4 pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-md hover:shadow-lg hover:opacity-95 transition-all"
          >
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Komponen Modal Khusus untuk Hero Slide ---
const HeroSlideModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    item || { is_active: true, display_order: 0 }
  );
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(item?.media_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalFormData = new FormData();
    Object.keys(formData).forEach((key) =>
      finalFormData.append(key, formData[key])
    );
    if (mediaFile) finalFormData.append("mediaFile", mediaFile);
    onSave(finalFormData, item?.id).finally(() => setIsSubmitting(false));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-50 p-8 rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all"
      >
        <h2 className="text-2xl font-bold text-slate-800">
          {item?.id ? "Edit Slide" : "Tambah Slide Baru"}
        </h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto pr-4">
          <div className="space-y-5">
            <StyledInput
              name="title"
              value={formData.title || ""}
              onChange={handleChange}
              placeholder="Judul Utama"
              required
            />
            <StyledTextarea
              name="subtitle"
              value={formData.subtitle || ""}
              onChange={handleChange}
              placeholder="Sub-judul (deskripsi)"
              rows="3"
            />
            <StyledInput
              name="cta_text"
              value={formData.cta_text || ""}
              onChange={handleChange}
              placeholder="Teks Tombol (e.g., Daftar)"
            />
            <StyledInput
              name="cta_url"
              value={formData.cta_url || ""}
              onChange={handleChange}
              placeholder="URL Tombol (e.g., /login)"
            />
            <div className="flex items-center gap-4 pt-2">
              <StyledInput
                name="display_order"
                type="number"
                value={formData.display_order || 0}
                onChange={handleChange}
                className="w-24"
              />
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active || false}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                Aktifkan Slide
              </label>
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Media (Gambar/Video)
            </label>
            <div className="w-full h-48 bg-slate-200 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative">
              {mediaPreview ? (
                mediaPreview.includes("video") ||
                (mediaFile && mediaFile.type.startsWith("video")) ? (
                  <video
                    src={getSafeImagePath(mediaPreview)}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={getSafeImagePath(mediaPreview)}
                    alt="Pratinjau"
                    fill
                    style={{ objectFit: "cover" }}
                  />
                )
              ) : (
                <div className="text-center text-slate-500">
                  <Icon
                    path="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm12-9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                    className="mx-auto h-10 w-10 text-slate-400"
                  />
                  <span className="mt-2 text-sm">Pratinjau Media</span>
                </div>
              )}
            </div>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200/80 transition-colors cursor-pointer"
            />
          </div>
        </div>
        <div className="flex justify-end items-center gap-4 pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-md hover:shadow-lg hover:opacity-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Slide"}
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Komponen Modal Khusus untuk Metode Pembayaran ---
const PaymentMethodModal = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    item || { is_active: true, display_order: 0 }
  );
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(item?.logo_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalFormData = new FormData();
    Object.keys(formData).forEach((key) =>
      finalFormData.append(key, formData[key])
    );
    if (logoFile) finalFormData.append("logoFile", logoFile);
    onSave(finalFormData, item?.id).finally(() => setIsSubmitting(false));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-50 p-8 rounded-2xl shadow-2xl w-full max-w-xl transform transition-all"
      >
        <h2 className="text-2xl font-bold text-slate-800">
          {item?.id ? "Edit Metode Pembayaran" : "Tambah Metode Pembayaran"}
        </h2>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-5 md:col-span-2">
            <StyledInput
              name="bank_name"
              value={formData.bank_name || ""}
              onChange={handleChange}
              placeholder="Nama Bank (e.g., BCA)"
              required
            />
            <StyledInput
              name="account_number"
              value={formData.account_number || ""}
              onChange={handleChange}
              placeholder="Nomor Rekening"
              required
            />
            <StyledInput
              name="account_holder_name"
              value={formData.account_holder_name || ""}
              onChange={handleChange}
              placeholder="Atas Nama"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Logo Bank
            </label>
            <div className="w-full h-24 bg-slate-200 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative">
              {logoPreview ? (
                <Image
                  src={getSafeImagePath(logoPreview)}
                  alt="Pratinjau"
                  fill
                  style={{ objectFit: "contain" }}
                  className="p-2"
                />
              ) : (
                <span className="text-slate-500 text-sm">Pratinjau Logo</span>
              )}
            </div>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200/80 transition-colors cursor-pointer"
            />
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Urutan Tampil
              </label>
              <StyledInput
                name="display_order"
                type="number"
                value={formData.display_order || 0}
                onChange={handleChange}
                className="w-24"
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer pt-4">
              <input
                name="is_active"
                type="checkbox"
                checked={formData.is_active || false}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              Aktifkan Metode Pembayaran
            </label>
          </div>
        </div>
        <div className="flex justify-end items-center gap-4 pt-6 mt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-md hover:shadow-lg hover:opacity-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Metode"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function ManageContentPage() {
  const [advantages, setAdvantages] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, type: null, item: null });
  const [slideModal, setSlideModal] = useState({ isOpen: false, item: null });
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    item: null,
  });
  const [activeTab, setActiveTab] = useState("promosi");

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [siteSettings, setSiteSettings] = useState({});
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const advPromise = axios.get("/api/public/advantages");
      const faqPromise = axios.get("/api/public/faqs");
      const slidesPromise = axios.get("/api/admin/hero-slides", config);
      const settingsPromise = axios.get("/api/public/settings");
      const paymentMethodsPromise = axios.get(
        "/api/admin/payment-methods",
        config
      );

      const [advRes, faqRes, slidesRes, settingsRes, paymentMethodsRes] =
        await Promise.all([
          advPromise,
          faqPromise,
          slidesPromise,
          settingsPromise,
          paymentMethodsPromise,
        ]);

      setAdvantages(advRes.data);
      setFaqs(faqRes.data);
      setHeroSlides(
        slidesRes.data.sort((a, b) => a.display_order - b.display_order)
      );
      // ===============================================
      // == PERBAIKAN 1: TAMBAHKAN BARIS INI ==
      // ===============================================
      setPaymentMethods(paymentMethodsRes.data);

      const settings = settingsRes.data;
      setLogoPreview(settings.logo_url);
      setSiteSettings(settings);
    } catch (error) {
      toast.error("Gagal memuat data konten.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Diperbarui dari [] menjadi [fetchData] untuk praktik terbaik

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSiteSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setIsUploadingLogo(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("logoFile", logoFile);
    try {
      const response = await axios.put("/api/admin/settings/logo", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Logo berhasil diperbarui!");
      setLogoPreview(response.data.logoUrl);
      setLogoFile(null);
    } catch (error) {
      toast.error("Gagal mengunggah logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUpdateSettings = async () => {
    setIsUpdatingSettings(true);
    const token = localStorage.getItem("token");
    try {
      await axios.put("/api/admin/settings", siteSettings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Pengaturan situs berhasil diperbarui!");
    } catch (error) {
      toast.error("Gagal memperbarui pengaturan situs.");
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleSave = async (itemData) => {
    const token = localStorage.getItem("token");
    const { type, item } = modal;
    const isNew = !item?.id;
    const url = isNew
      ? `/api/admin/${type}s`
      : `/api/admin/${type}s/${item.id}`;
    const method = isNew ? "post" : "put";
    try {
      await axios[method](url, itemData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(
        `${type === "advantage" ? "Keunggulan" : "FAQ"} berhasil disimpan!`
      );
      setModal({ isOpen: false, type: null, item: null });
      fetchData();
    } catch (error) {
      toast.error("Gagal menyimpan data.");
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus item ini?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`/api/admin/${type}s/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Item berhasil dihapus.");
      fetchData();
    } catch (error) {
      toast.error("Gagal menghapus item.");
    }
  };

  const handleSaveSlide = async (formData, slideId) => {
    const token = localStorage.getItem("token");
    const isNew = !slideId;
    const url = isNew
      ? "/api/admin/hero-slides"
      : `/api/admin/hero-slides/${slideId}`;
    const method = isNew ? "post" : "put";
    try {
      await axios[method](url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(`Slide berhasil ${isNew ? "dibuat" : "diperbarui"}!`);
      setSlideModal({ isOpen: false, item: null });
      fetchData();
    } catch (error) {
      toast.error("Gagal menyimpan slide.");
    }
  };

  const handleDeleteSlide = async (slideId) => {
    if (!window.confirm("Yakin ingin menghapus slide ini?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`/api/admin/hero-slides/${slideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Slide berhasil dihapus.");
      fetchData();
    } catch (error) {
      toast.error("Gagal menghapus slide.");
    }
  };

  const handleSavePaymentMethod = async (formData, methodId) => {
    const token = localStorage.getItem("token");
    const isNew = !methodId;
    const url = isNew
      ? "/api/admin/payment-methods"
      : `/api/admin/payment-methods/${methodId}`;
    const method = isNew ? "post" : "put";
    try {
      await axios[method](url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(
        `Metode pembayaran berhasil ${isNew ? "dibuat" : "diperbarui"}!`
      );
      setPaymentModal({ isOpen: false, item: null });
      fetchData();
    } catch (error) {
      toast.error("Gagal menyimpan metode pembayaran.");
    }
  };

  const handleDeletePaymentMethod = async (methodId) => {
    if (!window.confirm("Yakin ingin menghapus metode pembayaran ini?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`/api/admin/payment-methods/${methodId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Metode pembayaran berhasil dihapus.");
      fetchData();
    } catch (error) {
      toast.error("Gagal menghapus metode pembayaran.");
    }
  };

  return (
    <div className="relative bg-slate-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" autoClose={3000} />
      {modal.isOpen && (
        <ContentModal
          item={modal.item}
          type={modal.type}
          onClose={() => setModal({ isOpen: false })}
          onSave={handleSave}
        />
      )}
      {slideModal.isOpen && (
        <HeroSlideModal
          item={slideModal.item}
          onClose={() => setSlideModal({ isOpen: false })}
          onSave={handleSaveSlide}
        />
      )}
      {paymentModal.isOpen && (
        <PaymentMethodModal
          item={paymentModal.item}
          onClose={() => setPaymentModal({ isOpen: false })}
          onSave={handleSavePaymentMethod}
        />
      )}

      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-r from-amber-400 to-orange-500"></div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Manajemen Konten Website
          </h1>
          <p className="text-white/80 mt-2 max-w-2xl">
            Kelola semua konten dinamis yang tampil di halaman utama website
            Anda.
          </p>
        </div>

        <div className="border-b border-white/20">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("promosi")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === "promosi"
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:text-white"
              }`}
            >
              Pengaturan & Konten Promosi
            </button>
            <button
              onClick={() => setActiveTab("hero")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === "hero"
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:text-white"
              }`}
            >
              Manajemen Hero Banner
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === "payment"
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:text-white"
              }`}
            >
              Metode Pembayaran
            </button>
          </nav>
        </div>

        <div className="mt-8">
          {activeTab === "promosi" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold text-slate-900 mb-5">
                      Pengaturan Logo
                    </h2>
                    <div className="flex flex-col items-center gap-5">
                      <div className="w-full p-4 bg-slate-100 rounded-lg flex justify-center">
                        {logoPreview ? (
                          <Image
                            key={logoPreview}
                            src={getSafeImagePath(logoPreview)}
                            alt="Pratinjau Logo"
                            width={160}
                            height={45}
                            className="h-12 w-auto object-contain"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://placehold.co/160x45?text=Logo";
                            }}
                          />
                        ) : (
                          <div className="h-12 w-40 bg-slate-200 rounded-md flex items-center justify-center text-sm text-slate-500">
                            Memuat...
                          </div>
                        )}
                      </div>
                      <div className="w-full">
                        <input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                        <div className="flex gap-3">
                          <label
                            htmlFor="logo-upload"
                            className="w-full cursor-pointer text-center text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 py-2.5 px-4 rounded-lg transition-colors"
                          >
                            {logoFile
                              ? `File: ${logoFile.name}`
                              : "Pilih File Baru"}
                          </label>
                          <button
                            onClick={handleLogoUpload}
                            disabled={isUploadingLogo || !logoFile}
                            className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:bg-slate-400 transition-colors"
                          >
                            {isUploadingLogo ? "..." : "Unggah"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-lg">
                  <h2 className="text-xl font-bold text-slate-900 mb-5">
                    Pengaturan Teks & Link Global
                  </h2>
                  <div className="space-y-6">
                    {/* --- [BARU] Input untuk Teks Halaman Login --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      <div>
                        <label
                          htmlFor="login_title"
                          className="block text-sm font-semibold text-slate-700 mb-1.5"
                        >
                          Judul Login
                        </label>
                        <StyledInput
                          id="login_title"
                          type="text"
                          name="login_title"
                          value={siteSettings.login_title || ""}
                          onChange={handleSettingsChange}
                          placeholder="Graf-Bimbel"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="login_subtitle"
                          className="block text-sm font-semibold text-slate-700 mb-1.5"
                        >
                          Sub-judul Login
                        </label>
                        <StyledInput
                          id="login_subtitle"
                          type="text"
                          name="login_subtitle"
                          value={siteSettings.login_subtitle || ""}
                          onChange={handleSettingsChange}
                          placeholder="Platform Bimbingan Belajar Terpercaya"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="registration_url"
                        className="block text-sm font-semibold text-slate-700 mb-1.5"
                      >
                        Link Pendaftaran Utama
                      </label>
                      <StyledInput
                        id="registration_url"
                        type="url"
                        name="registration_url"
                        value={siteSettings.registration_url || ""}
                        onChange={handleSettingsChange}
                        placeholder="https://contoh.com/pendaftaran"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="footer_about"
                        className="block text-sm font-semibold text-slate-700 mb-1.5"
                      >
                        Deskripsi Footer
                      </label>
                      <StyledTextarea
                        id="footer_about"
                        name="footer_about"
                        value={siteSettings.footer_about || ""}
                        onChange={handleSettingsChange}
                        rows="3"
                        placeholder="Tulis deskripsi singkat perusahaan..."
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                      <div>
                        <label
                          htmlFor="contact_email"
                          className="block text-sm font-semibold text-slate-700 mb-1.5"
                        >
                          Email Kontak
                        </label>
                        <StyledInput
                          type="email"
                          id="contact_email"
                          name="contact_email"
                          value={siteSettings.contact_email || ""}
                          onChange={handleSettingsChange}
                          placeholder="kontak@website.com"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="contact_phone"
                          className="block text-sm font-semibold text-slate-700 mb-1.5"
                        >
                          Telepon
                        </label>
                        <StyledInput
                          type="text"
                          id="contact_phone"
                          name="contact_phone"
                          value={siteSettings.contact_phone || ""}
                          onChange={handleSettingsChange}
                          placeholder="0812-3456-7890"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          htmlFor="contact_address"
                          className="block text-sm font-semibold text-slate-700 mb-1.5"
                        >
                          Alamat
                        </label>
                        <StyledInput
                          type="text"
                          id="contact_address"
                          name="contact_address"
                          value={siteSettings.contact_address || ""}
                          onChange={handleSettingsChange}
                          placeholder="Jl. Merdeka No. 17, Jakarta"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                      <div>
                        <label
                          htmlFor="social_facebook_url"
                          className="block text-sm font-semibold text-slate-700 mb-1.5"
                        >
                          URL Facebook
                        </label>
                        <StyledInput
                          type="url"
                          id="social_facebook_url"
                          name="social_facebook_url"
                          value={siteSettings.social_facebook_url || ""}
                          onChange={handleSettingsChange}
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="social_twitter_url"
                          className="block text-sm font-semibold text-slate-700 mb-1.5"
                        >
                          URL Twitter
                        </label>
                        <StyledInput
                          type="url"
                          id="social_twitter_url"
                          name="social_twitter_url"
                          value={siteSettings.social_twitter_url || ""}
                          onChange={handleSettingsChange}
                          placeholder="https://twitter.com/..."
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="social_instagram_url"
                          className="block text-sm font-semibold text-slate-700 mb-1.5"
                        >
                          URL Instagram
                        </label>
                        <StyledInput
                          type="url"
                          id="social_instagram_url"
                          name="social_instagram_url"
                          value={siteSettings.social_instagram_url || ""}
                          onChange={handleSettingsChange}
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-200">
                      <button
                        onClick={handleUpdateSettings}
                        disabled={isUpdatingSettings}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg shadow-md hover:shadow-lg hover:opacity-95 transition-all disabled:opacity-60"
                      >
                        {isUpdatingSettings
                          ? "Menyimpan..."
                          : "Simpan Pengaturan Teks"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">
                      Keunggulan
                    </h2>
                    <button
                      onClick={() =>
                        setModal({
                          isOpen: true,
                          type: "advantage",
                          item: null,
                        })
                      }
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4" />{" "}
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-4">
                    {advantages.map((adv) => (
                      <div
                        key={adv.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center transition-shadow hover:shadow-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {adv.title}
                          </p>
                          <p className="text-sm text-slate-600">
                            {adv.description}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              setModal({
                                isOpen: true,
                                type: "advantage",
                                item: adv,
                              })
                            }
                            className="text-slate-400 hover:text-amber-500 transition-colors"
                          >
                            <Icon
                              path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                              className="w-5 h-5"
                            />
                          </button>
                          <button
                            onClick={() => handleDelete("advantage", adv.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Icon
                              path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              className="w-5 h-5"
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900">FAQ</h2>
                    <button
                      onClick={() =>
                        setModal({ isOpen: true, type: "faq", item: null })
                      }
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4" />{" "}
                      Tambah
                    </button>
                  </div>
                  <div className="space-y-4">
                    {faqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-lg transition-shadow hover:shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-slate-800 pr-4">
                            {faq.question}
                          </p>
                          <div className="flex space-x-2 flex-shrink-0">
                            <button
                              onClick={() =>
                                setModal({
                                  isOpen: true,
                                  type: "faq",
                                  item: faq,
                                })
                              }
                              className="text-slate-400 hover:text-amber-500 transition-colors"
                            >
                              <Icon
                                path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                className="w-5 h-5"
                              />
                            </button>
                            <button
                              onClick={() => handleDelete("faq", faq.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Icon
                                path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                className="w-5 h-5"
                              />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mt-1.5">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "hero" && (
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  Hero Banner Slides
                </h2>
                <button
                  onClick={() => setSlideModal({ isOpen: true, item: null })}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4" />
                  Tambah Slide
                </button>
              </div>
              <div className="space-y-4">
                {heroSlides.length > 0 ? (
                  heroSlides.map((slide) => (
                    <div
                      key={slide.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col md:flex-row gap-5 items-center transition-shadow hover:shadow-sm"
                    >
                      <div className="w-full md:w-48 h-28 bg-slate-200 rounded-md overflow-hidden flex-shrink-0 relative">
                        {slide.media_type === "video" ? (
                          <video
                            src={getSafeImagePath(slide.media_url)}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <Image
                            src={getSafeImagePath(slide.media_url)}
                            alt="media"
                            fill
                            style={{ objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://placehold.co/192x112?text=Media";
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-grow w-full">
                        <p className="font-bold text-slate-800">
                          {slide.title}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {slide.subtitle}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span
                            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                              slide.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {slide.is_active ? "Aktif" : "Tidak Aktif"}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Urutan: {slide.display_order}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2 flex-shrink-0 self-start md:self-center">
                        <button
                          onClick={() =>
                            setSlideModal({ isOpen: true, item: slide })
                          }
                          className="text-slate-400 hover:text-amber-500 transition-colors"
                        >
                          <Icon
                            path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                            className="w-5 h-5"
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteSlide(slide.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Icon
                            path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                            className="w-5 h-5"
                          />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-12">
                    Belum ada slide. Klik Tambah Slide untuk memulai.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =============================================== */}
          {/* == PERBAIKAN 2: TAMBAHKAN BLOK KODE INI == */}
          {/* =============================================== */}
          {activeTab === "payment" && (
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-slate-900">
                  Metode Pembayaran
                </h2>
                <button
                  onClick={() => setPaymentModal({ isOpen: true, item: null })}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4" />
                  Tambah Metode
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Logo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Nama Bank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Nomor Rekening
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Atas Nama
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method) => (
                        <tr key={method.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Image
                              src={getSafeImagePath(method.logo_url)}
                              alt={method.bank_name}
                              width={80}
                              height={25}
                              className="h-6 w-auto object-contain"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            {method.bank_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {method.account_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {method.account_holder_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                                method.is_active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {method.is_active ? "Aktif" : "Tidak Aktif"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() =>
                                  setPaymentModal({
                                    isOpen: true,
                                    item: method,
                                  })
                                }
                                className="text-slate-400 hover:text-amber-500 transition-colors"
                              >
                                <Icon
                                  path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                  className="w-5 h-5"
                                />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeletePaymentMethod(method.id)
                                }
                                className="text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Icon
                                  path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                  className="w-5 h-5"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center text-slate-500 py-12"
                        >
                          Belum ada metode pembayaran. Klik Tambah Metode untuk
                          memulai.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
