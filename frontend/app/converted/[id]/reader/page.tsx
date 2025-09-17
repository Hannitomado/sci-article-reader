"use client";
import { useEffect, useMemo, useState } from "react";
import { useAudioPlaylist } from "@/app/hooks/useAudioPlaylist";
import WordHighlighter from "@/app/components/WordHighlighter";
import { tokenizeParagraph, mergeTimings, findActiveWordIndex } from "@/app/lib/textTiming";
import { useParams } from "next/navigation";

type Paragraph = { id: string; text: string; audio_url: string };
type Article = { id: string; title: string; paragraphs: Paragraph[] };

export default function ReaderPage() {
  const params = useParams();
  const articleId = params?.id as string;
  const [article, setArticle] = useState<Article | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  const {
    audioRef, list, load,
    activeIndex, setIndex,
    isPlaying, toggle,
    progress, seek, currentTime, duration,
    next, prev,
  } = useAudioPlaylist();

  useEffect(() => {
    if (!articleId) return;
    (async () => {
      const res = await fetch(`/api/article/${articleId}`);
      if (!res.ok) throw new Error("Failed to load article");
      const data = await res.json();
      setArticle(data);
      load(data.paragraphs, 0);
    })();
  }, [articleId, load]);

  const tokens = useMemo(() => {
    if (!article) return [] as ReturnType<typeof tokenizeParagraph>[];
    return article.paragraphs.map(p => tokenizeParagraph(p.text));
  }, [article]);

  useEffect(() => {
    if (!article) return;
    const id = setInterval(() => {
      if (!duration || !isFinite(duration)) return;
      const t = currentTime;
      const tok = tokens[activeIndex] || [];
      const timings = mergeTimings(tok, undefined, duration);
      const idx = findActiveWordIndex(timings, t);
      setActiveWordIndex(idx);
    }, 100);
    return () => clearInterval(id);
  }, [article, tokens, activeIndex, currentTime, duration]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.code === "ArrowRight") { e.preventDefault(); next(); }
      if (e.code === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, next, prev]);

  if (!articleId) return <div className="p-6 text-red-600">Invalid article id.</div>;
  if (!article) return <div className="p-6">Loading…</div>;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">{article.title}</h1>

      <div className="rounded-2xl p-4 border shadow bg-white/5 flex items-center gap-3 sticky top-2 backdrop-blur">
        <audio ref={audioRef} preload="metadata" />
        <button
          onClick={toggle}
          className="px-3 py-1 rounded-2xl shadow border hover:shadow-lg"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="w-full"
          aria-label="Progress"
        />
        <span className="w-24 text-right tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <button onClick={prev} className="px-2 py-1 border rounded">⟨ Prev</button>
        <button onClick={next} className="px-2 py-1 border rounded">Next ⟩</button>
      </div>

      <div className="space-y-6">
        {article.paragraphs.map((p, i) => (
          <div
            id={`para-${i}`}
            key={p.id}
            className={`rounded-2xl p-4 ${i === activeIndex ? "ring-2 ring-blue-400" : "border"}`}
            onClick={() => setIndex(i)}
          >
            <div className="text-sm opacity-60 mb-2">Paragraph {i + 1}</div>
            <WordHighlighter
              text={p.text}
              activeWordIndex={i === activeIndex ? activeWordIndex : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}
