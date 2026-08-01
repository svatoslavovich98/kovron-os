/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Не блокировать production-сборку на предупреждениях линтера
  // (стиль кода не должен мешать деплою). Проверка TypeScript остаётся включённой.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
