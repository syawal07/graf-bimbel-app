import { Inter } from "next/font/google";
import "./globals.css";

// Konfigurasi untuk memuat font Inter dari Google
const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Opsi untuk performa
});

export const metadata = {
  title: "Graf Bimbel - Raih Impian Akademikmu!",
  description:
    "Pembelajaran Interaktif, Mentor Berpengalaman, Jadwal Fleksibel. Siap bantu kamu sukses!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="scroll-smooth">
      {/* Terapkan font Inter langsung ke body menggunakan className */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}
