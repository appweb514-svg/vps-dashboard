/** @type {import('next').NextConfig} */
const api = process.env.API_UPSTREAM || "http://api:3001";
const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/vps/:path*", destination: "http://localhost:8080/:path*" },
    ];
  },
};
export default nextConfig;
