"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useDebounce } from "use-debounce";
import dynamic from "next/dynamic";
import { loadSlim } from "tsparticles-slim";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const Particles = dynamic(() => import("react-tsparticles"), { ssr: false });

// Opsi untuk Partikel Latar Belakang
const particlesOptions = {
  fpsLimit: 120,
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: "repulse",
      },
      resize: true,
    },
    modes: {
      repulse: {
        distance: 80,
        duration: 0.4,
      },
    },
  },
  particles: {
    color: { value: "#ffffff" },
    links: {
      color: "#ffffff",
      distance: 150,
      enable: true,
      opacity: 0.2,
      width: 1,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: { default: "bounce" },
      random: false,
      speed: 2,
      straight: false,
    },
    number: { density: { enable: true, area: 800 }, value: 80 },
    opacity: { value: 0.2 },
    shape: { type: "circle" },
    size: { value: { min: 1, max: 3 } },
  },
  detectRetina: true,
};

// --- Fungsi Format Nomor WhatsApp ---
const formatWhatsappNumber = (phone, name) => {
  if (!phone) return "";
  let cleanedNumber = phone.replace(/\D/g, "");
  if (cleanedNumber.startsWith("0")) {
    cleanedNumber = "62" + cleanedNumber.substring(1);
  }
  const message = `Selamat pagi, Kak ${name}. \nKami dari Grafis Bimbel menginformasikan bahwa paket bimbingan Anda telah selesai. \n\nJika berkenan untuk melanjutkan, kami siap membantu Anda memilih paket selanjutnya. Terima kasih! 🙏`;
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
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
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center p-10">
    <svg
      className="animate-spin h-8 w-8 text-orange-500"
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
    <p className="mt-4 text-sm text-gray-600">Memuat data...</p>
  </div>
);

const EmptyState = ({ message, iconPath }) => (
  <div className="text-center p-10 border-2 border-dashed rounded-lg">
    <Icon path={iconPath} className="mx-auto h-12 w-12 text-gray-400" />
    <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
  </div>
);

// --- Komponen Modal untuk Broadcast ---
const BroadcastModal = ({ role, onClose, onSend }) => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.warn("Judul dan pesan tidak boleh kosong.");
      return;
    }
    setIsSubmitting(true);
    await onSend(role, title, message);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg">
        <h2 className="text-xl font-bold text-gray-900">
          Kirim Pengumuman ke Semua {role === "siswa" ? "Siswa" : "Mentor"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Pengumuman akan muncul sebagai notifikasi di dashboard mereka.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Judul Pengumuman
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              placeholder="Contoh: Jadwal Libur Lebaran"
              required
            />
          </div>
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700"
            >
              Isi Pesan
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="5"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              placeholder="Ketik detail pengumuman Anda di sini..."
              required
            ></textarea>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {isSubmitting ? "Mengirim..." : `Kirim Pengumuman`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Komponen Tabel Pengguna Universal ---
const UsersTable = ({
  users,
  handleDelete,
  selectedUsers,
  onSelect,
  onSelectAll,
  activeTab,
}) => {
  const isStudentTab = activeTab === "siswa" || activeTab === "inactive";

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-4">
            <input
              type="checkbox"
              onChange={onSelectAll}
              checked={
                users.length > 0 && selectedUsers.length === users.length
              }
              className="rounded border-gray-300 text-orange-600"
            />
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
            Nama & Email
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
            No. Telepon
          </th>
          {isStudentTab ? (
            <>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Kota
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Sekolah
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Progres Sesi
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Kadaluarsa Paket Terbaru
              </th>
            </>
          ) : (
            <>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Mapel Keahlian
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                Jenjang Ajar
              </th>
            </>
          )}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">
            Aksi
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {users.map((user) => (
          <tr
            key={user.user_id}
            className={
              selectedUsers.includes(user.user_id)
                ? "bg-orange-50"
                : "hover:bg-gray-50"
            }
          >
            <td className="p-4">
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.user_id)}
                onChange={() => onSelect(user.user_id)}
                className="rounded border-gray-300 text-orange-600"
              />
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-gray-900">
                {user.role === "siswa" ? (
                  <Link
                    href={`/dashboard/admin/users/student-profile/${user.user_id}`}
                    className="text-orange-600 hover:underline"
                  >
                    {user.full_name}
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/admin/mentors/${user.user_id}`}
                    className="text-orange-600 hover:underline"
                  >
                    {user.full_name}
                  </Link>
                )}
              </div>
              <div className="text-sm text-gray-600">{user.email}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {user.phone_number || "-"}
            </td>
            {isStudentTab ? (
              <>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.city || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.school || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold text-center">
                  {user.total_packages > 1 ? (
                    <Link
                      href={`/dashboard/admin/users/student-profile/${user.user_id}`}
                      className="text-orange-600 hover:underline font-bold"
                    >
                      {`${user.active_packages || 0} Aktif / ${
                        user.total_packages
                      } Total`}
                    </Link>
                  ) : (
                    <span>{`${user.used_sessions ?? 0} / ${
                      user.total_sessions ?? 0
                    }`}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.expiry_date
                    ? format(new Date(user.expiry_date), "dd MMM yyyy", {
                        locale: id,
                      })
                    : "N/A"}
                </td>
              </>
            ) : (
              <>
                <td
                  className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs"
                  title={user.expert_subjects?.join(", ")}
                >
                  {user.expert_subjects?.join(", ") || "-"}
                </td>
                <td
                  className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs"
                  title={user.teachable_levels?.join(", ")}
                >
                  {user.teachable_levels?.join(", ") || "-"}
                </td>
              </>
            )}
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
              {activeTab === "inactive" && user.phone_number && (
                <a
                  href={formatWhatsappNumber(user.phone_number, user.full_name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-green-600 hover:text-green-800 font-semibold"
                  title={`Hubungi ${user.full_name} via WhatsApp`}
                >
                  <Icon
                    path="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.056 3 12c0 2.222.875 4.25 2.312 5.84.28.32.54.664.79 1.03-.543.23-1.075.52-1.576.88a.75.75 0 00-.44 1.22c.264.31.63.46.98.46.22 0 .43-.05.62-.15 1.57-1.05 3.205-1.74 4.89-2.07.36-.07.72-.13.99-.2.43.34.89.63 1.37.86a.75.75 0 00.99-.46c.16-.38.04-.81-.28-1.05-.28-.21-.59-.4-1.08-.54a7.51 7.51 0 01-1.39-1.05c.34 0 .67.02 1 .04z"
                    className="w-4 h-4"
                  />
                  WA
                </a>
              )}
              <Link
                href={`/dashboard/admin/users/${user.user_id}/edit`}
                className="text-gray-600 hover:text-orange-600"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(user.user_id, user.full_name)}
                className="text-red-500 hover:text-red-700"
              >
                Hapus
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// --- Halaman Utama ---
export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("siswa");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    const params = {
      search: debouncedSearchTerm,
      page: currentPage,
    };

    if (activeTab === "siswa") {
      params.role = "siswa";
      params.status = "active";
    } else if (activeTab === "inactive") {
      params.role = "siswa";
      params.status = "inactive";
    } else {
      params.role = activeTab;
    }

    try {
      const response = await axios.get("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
        params,
      });
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error("Gagal memuat data pengguna.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedSearchTerm, currentPage]);

  useEffect(() => {
    fetchData();
    setSelectedUsers([]);
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearchTerm]);

  const handleSelect = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map((user) => user.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus pengguna "${userName}"? Aksi ini tidak bisa dibatalkan.`
      )
    )
      return;
    await deleteUsers([userId]);
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      toast.warn("Pilih setidaknya satu pengguna untuk dihapus.");
      return;
    }
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus ${selectedUsers.length} pengguna yang dipilih? Aksi ini tidak bisa dibatalkan.`
      )
    )
      return;
    await deleteUsers(selectedUsers);
  };

  const deleteUsers = async (userIds) => {
    const token = localStorage.getItem("token");
    try {
      const endpoint =
        userIds.length === 1
          ? `/api/admin/users/${userIds[0]}`
          : `/api/admin/users/bulk`;
      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        data: { userIds },
      });
      toast.success(`${userIds.length} pengguna berhasil dihapus.`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus pengguna.");
    }
  };

  const handleOpenBroadcastModal = () => {
    setIsBroadcastModalOpen(true);
  };

  const handleSendBroadcast = async (role, title, message) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.post(
        "/api/admin/announcements",
        { target_role: role, title, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message || "Pengumuman berhasil dikirim!");
      setIsBroadcastModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengirim pengumuman.");
    }
  };

  return (
    <div className="relative bg-gray-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" />
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-r from-yellow-400 to-orange-500">
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={particlesOptions}
        />
      </div>

      {isBroadcastModalOpen && (
        <BroadcastModal
          role={activeTab === "inactive" ? "siswa" : activeTab}
          onClose={() => setIsBroadcastModalOpen(false)}
          onSend={handleSendBroadcast}
        />
      )}

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Manajemen Pengguna
            </h1>
            <p className="text-white/80 mt-1">
              Kelola data siswa dan tutor Anda di sini.
            </p>
          </div>
          <Link
            href="/dashboard/admin/users/new"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-orange-600 bg-white rounded-md shadow-sm hover:bg-gray-100"
          >
            <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-5 h-5" />
            Tambah Pengguna
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("siswa")}
                className={`${
                  activeTab === "siswa"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Siswa Aktif
              </button>
              <button
                onClick={() => setActiveTab("mentor")}
                className={`${
                  activeTab === "mentor"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Tutor
              </button>
              <button
                onClick={() => setActiveTab("inactive")}
                className={`${
                  activeTab === "inactive"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Siswa Paket Habis
              </button>
            </nav>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-4 mt-6">
            <div className="relative w-full sm:w-auto flex-grow">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon
                  path="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  className="h-5 w-5 text-gray-400"
                />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Cari nama ${
                  activeTab === "siswa" || activeTab === "inactive"
                    ? "siswa"
                    : "tutor"
                }...`}
                className="w-full rounded-md border-gray-300 shadow-sm pl-10 placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-4">
              {(activeTab === "siswa" || activeTab === "mentor") && (
                <button
                  onClick={handleOpenBroadcastModal}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Icon
                    path="M10 1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0110 1.5zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM4.134 5.866a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM15.866 17.866a.75.75 0 011.06 0l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM18.25 10a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM2.75 10a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM5.196 15.866a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06zM16.926 6.926a.75.75 0 011.06-1.06l1.06 1.06a.75.75 0 01-1.06 1.06l-1.06-1.06z"
                    className="w-4 h-4"
                  />
                  Kirim Pengumuman
                </button>
              )}
              {selectedUsers.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 flex items-center gap-2"
                >
                  <Icon
                    path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09.92-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                    className="w-4 h-4"
                  />
                  Hapus ({selectedUsers.length})
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <>
                {users.length > 0 ? (
                  <UsersTable
                    users={users}
                    handleDelete={handleDelete}
                    selectedUsers={selectedUsers}
                    onSelect={handleSelect}
                    onSelectAll={handleSelectAll}
                    activeTab={activeTab}
                  />
                ) : (
                  <EmptyState
                    message={
                      activeTab === "inactive"
                        ? "Tidak ada siswa dengan paket yang sudah habis."
                        : "Tidak ada data pengguna yang ditemukan."
                    }
                    iconPath={
                      activeTab === "inactive"
                        ? "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        : "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663M12 12.75a3 3 0 110-6 3 3 0 010 6z"
                    }
                  />
                )}
              </>
            )}
          </div>

          {totalPages > 1 && !isLoading && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
