import "./globals.css";
import Link from "next/link";
import Script from "next/script";

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
    <html lang="en" data-theme="light">
      <head>
        {/* Apply theme before hydration to avoid flash */}
        <Script id="ondu-theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var stored = localStorage.getItem("onduTheme");
                var theme = stored === "dark" ? "dark" : "light";
                document.documentElement.setAttribute("data-theme", theme);
              } catch (e) {}
            })();
          `}
        </Script>

        {/* Wire up the toggle button without turning layout into a client component */}
        <Script id="ondu-theme-toggle" strategy="afterInteractive">
          {`
            (function() {
              function getTheme() {
                try {
                  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
                } catch (e) { return "light"; }
              }

              function setTheme(theme) {
                try {
                  document.documentElement.setAttribute("data-theme", theme);
                  localStorage.setItem("onduTheme", theme);
                } catch (e) {}
                syncUI();
              }

              function syncUI() {
                var btn = document.getElementById("ondu-theme-btn");
                if (!btn) return;
                var theme = getTheme();
                btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
                btn.textContent = theme === "dark" ? "Night" : "Day";
                btn.title = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
              }

              function toggleTheme() {
                var theme = getTheme();
                setTheme(theme === "dark" ? "light" : "dark");
              }

              document.addEventListener("DOMContentLoaded", function() {
                var btn = document.getElementById("ondu-theme-btn");
                if (btn) btn.addEventListener("click", toggleTheme);
                syncUI();
              });

              // In case scripts run after DOMContentLoaded in some dev cases
              setTimeout(function() {
                var btn = document.getElementById("ondu-theme-btn");
                if (btn && !btn.__onduBound) {
                  btn.__onduBound = true;
                  btn.addEventListener("click", toggleTheme);
                }
                syncUI();
              }, 0);
            })();
          `}
        </Script>
      </head>

      <body className="min-h-screen text-[color:var(--text-primary)]">
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
              <button
                id="ondu-theme-btn"
                type="button"
                aria-pressed="false"
                className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
                title="Switch theme"
              >
                Day
              </button>

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

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
