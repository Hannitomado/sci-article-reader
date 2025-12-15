import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Ondu",
  description: "Read clean. Listen clearly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-[color:var(--text-primary)]">
        {/* Top nav */}
        <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--bg)_88%,transparent)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_40%,transparent)] text-sm font-semibold">
                O
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Ondu</div>
                <div className="text-xs ondu-muted">Read clean. Listen clearly.</div>
              </div>
            </Link>

            <nav className="flex items-center gap-2">
              <Link
                href="/upload"
                className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
              >
                Upload
              </Link>
              <Link
                href="/converted"
                className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
              >
                Library
              </Link>
              <Link
                href="/delete"
                className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
              >
                Delete
              </Link>
            </nav>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
