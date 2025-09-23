"use client";

import { useEffect, useState, useCallback, useMemo } from "react"; // Ditambahkan useMemo
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { format, formatDistanceToNow, parseISO, isValid } from "date-fns"; // Ditambahkan parseISO & isValid
import { id } from "date-fns/locale";

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
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
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
const EmptyState = ({ message }) => (
  <div className="text-center p-10 min-h-screen bg-gray-100 flex flex-col justify-center">
    <Icon
      path="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      className="mx-auto h-16 w-16 text-gray-400"
    />
    <p className="mt-4 text-xl font-semibold text-gray-700">{message}</p>
    <Link
      href="/dashboard/admin/users"
      className="mt-6 inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 font-semibold transition-colors"
    >
      <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" /> Kembali ke
      Manajemen Pengguna
    </Link>
  </div>
);
const InfoDetail = ({ iconPath, label, value, isNote = false }) => (
  <div className="flex items-start gap-4">
    <Icon
      path={iconPath}
      className="w-6 h-6 text-orange-500 mt-1 flex-shrink-0"
    />
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p
        className={`text-base font-semibold text-gray-800 ${
          isNote && "font-normal italic"
        }`}
      >
        {value || "-"}
      </p>
    </div>
  </div>
);
const baseInputStyle =
  "block w-full rounded-lg border-gray-300 shadow-sm text-black placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500 px-4 py-2.5";

// --- Komponen Modal Kelola Mentor ---
const ManageMentorModal = ({
  userPackage,
  allMentors,
  onClose,
  onActionSuccess,
}) => {
  const [assignedMentors, setAssignedMentors] = useState(
    userPackage.mentors || []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [newMentorData, setNewMentorData] = useState({
    mentor_id: "",
    session_rate: "",
    assignment_type: "utama",
  });

  const availableMentors = allMentors.filter(
    (mentor) =>
      !assignedMentors.some((am) => am.mentor_id === mentor.user_id) &&
      mentor.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMentor = async () => {
    if (!newMentorData.mentor_id || !newMentorData.session_rate) {
      toast.warn("Pilih mentor dan isi tarif sesi.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `/api/admin/user-packages/${userPackage.user_package_id}/mentors`,
        {
          mentor_id: newMentorData.mentor_id,
          session_rate: newMentorData.session_rate,
          assignment_type: newMentorData.assignment_type,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Mentor berhasil ditambahkan.");
      setNewMentorData({
        mentor_id: "",
        session_rate: "",
        assignment_type: "utama",
      });
      onActionSuccess(); // Refresh data di halaman utama
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menambah mentor.");
    }
  };

  const handleRemoveMentor = async (mentorId) => {
    if (
      !confirm(
        "Yakin ingin menghapus penugasan mentor ini dari paket? Jadwal mendatang yang terkait akan perlu diatur ulang."
      )
    )
      return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `/api/admin/user-packages/${userPackage.user_package_id}/mentors/${mentorId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Penugasan mentor berhasil dihapus.");
      onActionSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menghapus mentor.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Kelola Mentor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Atur tim mentor untuk paket:{" "}
          <strong className="text-orange-600">
            {userPackage.package_name}
          </strong>
        </p>

        <div className="mt-4 flex-grow overflow-y-auto pr-2 space-y-4">
          {/* Daftar Mentor Saat Ini */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Mentor Ditugaskan ({assignedMentors.length}/5)
            </h3>
            <div className="space-y-2">
              {assignedMentors.map((m) => (
                <div
                  key={m.mentor_id}
                  className="flex items-center justify-between p-2 border rounded-lg bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{m.full_name}</p>
                    <p className="text-xs text-gray-500">
                      Tarif: Rp{" "}
                      {new Intl.NumberFormat("id-ID").format(m.session_rate)} -
                      ({m.assignment_type})
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveMentor(m.mentor_id)}
                    className="p-1.5 text-red-500 bg-red-100 hover:bg-red-200 rounded-full"
                  >
                    <Icon
                      path="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      className="w-4 h-4"
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Form Tambah Mentor Baru */}
          {assignedMentors.length < 5 && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-gray-800 mb-2">
                Tambah Mentor Baru
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="🔍 Cari nama mentor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={baseInputStyle}
                />
                <select
                  value={newMentorData.mentor_id}
                  onChange={(e) =>
                    setNewMentorData((prev) => ({
                      ...prev,
                      mentor_id: e.target.value,
                    }))
                  }
                  className={baseInputStyle}
                >
                  <option value="">-- Pilih Mentor --</option>
                  {availableMentors.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Tarif Sesi (Rp)"
                  value={newMentorData.session_rate}
                  onChange={(e) =>
                    setNewMentorData((prev) => ({
                      ...prev,
                      session_rate: e.target.value,
                    }))
                  }
                  className={baseInputStyle}
                />
                <select
                  value={newMentorData.assignment_type}
                  onChange={(e) =>
                    setNewMentorData((prev) => ({
                      ...prev,
                      assignment_type: e.target.value,
                    }))
                  }
                  className={baseInputStyle}
                >
                  <option value="utama">Utama</option>
                  <option value="cadangan">Cadangan</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddMentor}
                  className="w-full justify-center flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Icon path="M12 4.5v15m7.5-7.5h-15" className="w-5 h-5" />{" "}
                  Tambahkan ke Paket
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Halaman Utama Profil Siswa ---
export default function StudentProfilePage() {
  const [profile, setProfile] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPackages, setSelectedPackages] = useState([]); // <-- [BARU] State untuk checkbox
  const params = useParams();
  const { id: studentId } = params;

  const formatDateSafely = (dateString, formatStr) => {
    if (!dateString) return "N/A";
    const date = parseISO(dateString); // <-- Menggunakan parseISO untuk keandalan
    if (!isValid(date)) return "N/A";
    if (formatStr === "distance")
      return formatDistanceToNow(date, { addSuffix: true, locale: id });
    return format(date, formatStr, { locale: id });
  };

  const fetchData = useCallback(async () => {
    if (studentId) {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      try {
        const profilePromise = axios.get(
          `/api/admin/users/student-profile/${studentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const mentorsPromise = axios.get(`/api/admin/mentors`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const [profileRes, mentorsRes] = await Promise.all([
          profilePromise,
          mentorsPromise,
        ]);

        setProfile(profileRes.data);
        setMentors(Array.isArray(mentorsRes.data) ? mentorsRes.data : []);
        setSelectedPackages([]); // <-- [BARU] Reset pilihan saat data baru dimuat
      } catch (error) {
        setProfile(null);
        toast.error("Gagal memuat profil siswa atau siswa tidak ditemukan.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { student, packageHistory } = profile || {};

  // --- [BARU] Logika untuk Checkbox ---
  const hideablePackageIds = useMemo(
    () =>
      packageHistory
        ?.filter((pkg) => pkg.status === "finished" || pkg.status === "expired")
        .map((pkg) => pkg.user_package_id) || [],
    [packageHistory]
  );

  const handleSelectOne = (e, packageId) => {
    if (e.target.checked) {
      setSelectedPackages((prev) => [...prev, packageId]);
    } else {
      setSelectedPackages((prev) => prev.filter((id) => id !== packageId));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPackages(hideablePackageIds);
    } else {
      setSelectedPackages([]);
    }
  };

  const handleBulkHide = async () => {
    if (selectedPackages.length === 0) {
      toast.warn("Pilih setidaknya satu riwayat paket untuk disembunyikan.");
      return;
    }
    if (
      !confirm(
        `Yakin ingin menyembunyikan ${selectedPackages.length} riwayat paket terpilih?`
      )
    )
      return;

    const token = localStorage.getItem("token");
    try {
      const response = await axios.put(
        "/api/admin/user-packages/bulk-hide",
        { userPackageIds: selectedPackages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message || "Paket berhasil disembunyikan.");
      fetchData(); // Refresh data setelah berhasil
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Gagal menyembunyikan riwayat."
      );
    }
  };
  // --- Akhir Logika Checkbox ---

  const handleActionSuccess = () => {
    setSelectedPackage(null);
    fetchData();
  };

  if (isLoading) return <LoadingSpinner text="Memuat profil siswa..." />;
  if (!profile) return <EmptyState message="Profil siswa tidak ditemukan." />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-screen">
      <ToastContainer position="top-center" theme="colored" />
      {selectedPackage && (
        <ManageMentorModal
          userPackage={selectedPackage}
          allMentors={mentors}
          onClose={() => setSelectedPackage(null)}
          onActionSuccess={handleActionSuccess}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard/admin/users"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors"
          >
            <Icon path="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />{" "}
            Kembali ke Manajemen Pengguna
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white text-4xl font-bold flex-shrink-0">
              {student.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {student.full_name}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Terdaftar {formatDateSafely(student.created_at, "distance")}
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                <InfoDetail
                  iconPath="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  label="Email"
                  value={student.email}
                />
                <InfoDetail
                  iconPath="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z"
                  label="No. Telepon"
                  value={student.phone_number}
                />
                <InfoDetail
                  iconPath="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275"
                  label="Nama Panggilan"
                  value={student.nickname}
                />
                <InfoDetail
                  iconPath="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                  label="Asal Kota"
                  value={student.city}
                />
                <InfoDetail
                  iconPath="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18"
                  label="Asal Sekolah"
                  value={student.school}
                />
                <InfoDetail
                  iconPath="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  label="Catatan"
                  value={student.notes}
                  isNote={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- [BARU] Tampilan Riwayat Paket dengan Checkbox --- */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Riwayat Paket Bimbel
            </h2>
            {selectedPackages.length > 0 && (
              <button
                onClick={handleBulkHide}
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm"
              >
                <Icon
                  path="M3.98 8.223A.75.75 0 003 9v6a.75.75 0 00.98.727l2.252-.451a.75.75 0 00.727-.98l-.45-2.252a.75.75 0 00-.98-.727L3.98 8.223zM8.25 3a.75.75 0 00-.75.75v16.5a.75.75 0 001.5 0V3.75A.75.75 0 008.25 3z"
                  className="w-4 h-4"
                />
                Hapus ({selectedPackages.length})
              </button>
            )}
          </div>

          {packageHistory && packageHistory.length > 0 ? (
            <div>
              <div className="mb-4 flex items-center gap-3 p-2">
                <input
                  type="checkbox"
                  id="select-all"
                  onChange={handleSelectAll}
                  checked={
                    hideablePackageIds.length > 0 &&
                    selectedPackages.length === hideablePackageIds.length
                  }
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium text-gray-600"
                >
                  Pilih Semua (Selesai/Kedaluwarsa)
                </label>
              </div>
              <div className="space-y-4">
                {packageHistory.map((pkg) => {
                  const used_sessions = pkg.used_sessions ?? 0;
                  const progress =
                    pkg.total_sessions > 0
                      ? (used_sessions / pkg.total_sessions) * 100
                      : 0;
                  const isHideable =
                    pkg.status === "finished" || pkg.status === "expired";

                  return (
                    <div
                      key={pkg.user_package_id}
                      className={`bg-white p-6 rounded-xl shadow-md transition-all ${
                        selectedPackages.includes(pkg.user_package_id)
                          ? "ring-2 ring-orange-500"
                          : ""
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div className="flex items-start gap-4 flex-grow">
                          {isHideable && (
                            <input
                              type="checkbox"
                              checked={selectedPackages.includes(
                                pkg.user_package_id
                              )}
                              onChange={(e) =>
                                handleSelectOne(e, pkg.user_package_id)
                              }
                              className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 mt-1 flex-shrink-0"
                            />
                          )}
                          <div>
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                                pkg.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : pkg.status === "finished"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {pkg.status === "finished"
                                ? "Selesai"
                                : pkg.status}
                            </span>
                            <p className="font-bold text-lg text-gray-800 mt-2">
                              {pkg.package_name}
                            </p>
                            <div className="text-sm text-gray-500 mt-2 space-y-1">
                              <p className="font-medium text-gray-700">
                                Tim Mentor:
                              </p>
                              {pkg.mentors && pkg.mentors.length > 0 ? (
                                <ul className="list-disc list-inside">
                                  {pkg.mentors.map((m) => (
                                    <li key={m.mentor_id}>
                                      {m.full_name} ({m.assignment_type})
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>Belum ada mentor ditugaskan.</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {pkg.status === "active" && (
                          <button
                            onClick={() => setSelectedPackage(pkg)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-yellow-500 rounded-md shadow-sm hover:opacity-90 transition-opacity w-full sm:w-auto justify-center"
                          >
                            <Icon
                              path="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                              className="w-4 h-4"
                            />{" "}
                            Kelola Mentor
                          </button>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span className="font-medium text-gray-600">
                            Progres Sesi: {used_sessions} / {pkg.total_sessions}
                          </span>
                          <span className="font-semibold text-orange-600">
                            {Math.round(progress)}% selesai
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2.5 rounded-full"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>
                            Mulai:{" "}
                            {formatDateSafely(
                              pkg.activation_date,
                              "dd MMM yyyy"
                            )}
                          </span>
                          <span>
                            Kadaluarsa:{" "}
                            {formatDateSafely(pkg.expiry_date, "dd MMM yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center p-10 border-2 border-dashed rounded-lg bg-white">
              <Icon
                path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414-.336.75-.75.75h-.75m0-1.5h.375c.621 0 1.125.504 1.125 1.125v.375m-1.5-1.5v.75a.75.75 0 00.75.75h.75M3 12h18M3 15h18"
                className="mx-auto h-12 w-12 text-gray-400"
              />
              <p className="mt-4 text-sm font-medium text-gray-600">
                Siswa ini belum memiliki riwayat paket bimbel.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
