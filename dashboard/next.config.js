/** @type {import('next').NextConfig} */
const nextConfig = { async rewrites(){ return [
  {source:"/api/:path*",destination:"http://localhost:3001/api/:path*"},
  {source:"/vps/:path*",destination:"http://localhost:8080/:path*"},
] } };
export default nextConfig;
