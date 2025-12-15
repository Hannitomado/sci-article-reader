import "./globals.css";
import Script from "next/script";
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
    <html lang="en" data-theme="light">
      <head>
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

        <Script id="ondu-theme-toggle" strategy="afterInteractive">
          {`
            (function() {
              function getTheme() {
                return document.documentElement.getAttribute("data-theme") === "dark"
                  ? "dark"
                  : "light";
              }

              function setTheme(theme) {
                document.documentElement.setAttribute("data-theme", theme);
                localStorage.setItem("onduTheme", theme);
                syncUI();
              }

              function syncUI() {
                var btn = document.getElementById("ondu-theme-btn");
                if (!btn) return;
                var theme = getTheme();
                btn.textContent = theme === "dark" ? "☾" : "☼";
                btn.setAttribute("aria-pressed", theme === "dark");
              }

              function toggleTheme() {
                setTheme(getTheme() === "dark" ? "light" : "dark");
              }

              document.addEventListener("DOMContentLoaded", function() {
                var btn = document.getElementById("ondu-theme-btn");
                if (btn) btn.addEventListener("click", toggleTheme);
                syncUI();
              });

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
        {/* Device status strip */}
        <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:color-mix(in_srgb,var(--bg)_92%,transparent)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
            <Link
              href="/?screen=welcome"
              className="
                flex items-baseline gap-2
                text-sm
                cursor-pointer
                select-none
                rounded-md
                px-1
                hover:bg-[color:color-mix(in_srgb,var(--surface)_25%,transparent)]
                focus-visible:outline-none
                focus-visible:bg-[color:color-mix(in_srgb,var(--surface)_25%,transparent)]
              "
              title="Return to start"
            >
              <span className="font-medium">Ondu</span>
              <span className="font-semibold">音読</span>
            </Link>

            {/* Theme mode switch */}
            <button
              id="ondu-theme-btn"
              type="button"
              aria-pressed="false"
              title="Toggle theme"
              className="
                px-2 py-1
                text-bold
                rounded-md
                cursor-pointer
                select-none
                transition-colors duration-100
                hover:bg-[color:color-mix(in_srgb,var(--surface)_35%,transparent)]
                focus-visible:outline-none
                focus-visible:bg-[color:color-mix(in_srgb,var(--surface)_35%,transparent)]
              "
            >
              ☼
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
