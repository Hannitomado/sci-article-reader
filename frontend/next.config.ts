import type { NextConfig } from "next";

const backend = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // ---- Backend API namespace (FastAPI) ----
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },

      // ---- Backend static files (audio) ----
      {
        source: "/static/:path*",
        destination: `${backend}/static/:path*`,
      },

      // ---- Celery task polling ----
      {
        source: "/task_status/:path*",
        destination: `${backend}/task_status/:path*`,
      },

      // ---- Upload endpoint (FastAPI) ----
      {
        source: "/upload",
        destination: `${backend}/upload`,
      },

      // ---- Audio generation trigger (FastAPI) ----
      {
        source: "/generate_audio/:path*",
        destination: `${backend}/generate_audio/:path*`,
      },

      // ---- Health / Admin / Debug endpoints ----
      {
        source: "/health/tts",
        destination: `${backend}/health/tts`,
      },
      {
        source: "/admin/tts/providers",
        destination: `${backend}/admin/tts/providers`,
      },
      {
        source: "/ping_celery",
        destination: `${backend}/ping_celery`,
      },
    ];
  },
};

export default nextConfig;
