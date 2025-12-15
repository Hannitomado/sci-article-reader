"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import WelcomeScreen from "./screens/WelcomeScreen";
import MainMenu from "./screens/MainMenu";
import UploadScreen from "./screens/UploadScreen";
import DeleteScreen from "./screens/DeleteScreen";
import ArticleListScreen from "./screens/ArticleListScreen";

type Screen = "welcome" | "main" | "upload" | "delete" | "list";

export default function Home() {
  const searchParams = useSearchParams();

  const screenParam = (searchParams.get("screen") as Screen) || "welcome";
  const [screen, setScreen] = useState<Screen>(screenParam);

  // Keep state synced if user lands with a URL like /?screen=upload
  useEffect(() => {
    setScreen(screenParam);
  }, [screenParam]);

  function navigate(next: Screen) {
    setScreen(next);

    // Keep URL in sync so header link always has an effect
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", next);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  }

  const renderScreen = () => {
    switch (screen) {
      case "welcome":
        return <WelcomeScreen onNext={() => navigate("main")} />;
      case "main":
        return <MainMenu onNavigate={(s: string) => navigate(s as Screen)} />;
      case "upload":
        return <UploadScreen onBack={() => navigate("main")} />;
      case "delete":
        return <DeleteScreen onBack={() => navigate("main")} />;
      case "list":
        return <ArticleListScreen onBack={() => navigate("main")} />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] px-4">
      <div className="min-h-[calc(100vh-72px)] flex items-start sm:items-center justify-center pt-8 sm:py-10">
        <div className="w-full max-w-md sm:max-w-lg">
          <div className="ondu-surface-solid px-6 py-8 sm:px-10 sm:py-10">
            {renderScreen()}
          </div>
        </div>
      </div>
    </main>
  );
}
