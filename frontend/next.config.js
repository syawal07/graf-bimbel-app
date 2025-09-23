/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:5000/api/:path*",
      },
      // TAMBAHKAN RULE BARU INI
      {
        source: "/uploads/:path*",
        destination: "http://backend:5000/uploads/:path*",
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "backend",
        port: "5000",
        pathname: "/uploads/**",
      },
    ],
  },
};

module.exports = nextConfig;
