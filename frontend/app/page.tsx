"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import WelcomeScreen from "./screens/WelcomeScreen";
import MainMenu from "./screens/MainMenu";
import UploadScreen from "./screens/UploadScreen";
import DeleteScreen from "./screens/DeleteScreen";
import ArticleListScreen from "./screens/ArticleListScreen";

export default function Home() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get("screen") as string) || "welcome";
  const [screen, setScreen] = useState(initial);

  const renderScreen = () => {
    switch (screen) {
      case "welcome":
        // ✅ Correct flow: landing enters the device (main menu), not a single workflow (upload).
        return <WelcomeScreen onNext={() => setScreen("main")} />;
      case "main":
        return <MainMenu onNavigate={setScreen} />;
      case "upload":
        return <UploadScreen onBack={() => setScreen("main")} />;
      case "delete":
        return <DeleteScreen onBack={() => setScreen("main")} />;
      case "list":
        return <ArticleListScreen onBack={() => setScreen("main")} />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] px-4">
      {/* Center the device panel within the available viewport, but bias slightly upward
          so it doesn’t feel “sunk” under the navbar. */}
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-10">
        <div className="w-full max-w-md sm:max-w-lg">
          <div className="ondu-surface-solid px-6 py-8 sm:px-10 sm:py-10">
            {renderScreen()}
          </div>

          {/* Small escape hatch: if you’re in a sub-screen, allow jumping back to the menu.
              Kept subtle so the landing stays minimal. */}
          {screen !== "main" && screen !== "welcome" && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setScreen("main")}
                className="rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-[color:color-mix(in_srgb,var(--surface)_55%,transparent)]"
              >
                Menu
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
