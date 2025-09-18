"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string>("");
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentTimings, setCurrentTimings] = useState<ReturnType<typeof mergeTimings> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasFocus, setHasFocus] = useState(false);

  const {
    audioRef, list, load,
    activeIndex, setIndex,
    isPlaying, toggle,
    progress, seek, currentTime, duration,
    next, prev,
    hasMetadata, hasEverPlayed,
    notice, setNotice,
  } = useAudioPlaylist();

  // Fetch article and load tracks (skip empty text)
  useEffect(() => {
    if (!articleId) return;
    (async () => {
      try {
        const res = await fetch(`/api/article/${articleId}`);
        if (!res.ok) throw new Error(`Failed to load article (${res.status})`);
        const data = await res.json();
        setArticle(data);
        setError(null);
        const tracks = (data.paragraphs as Paragraph[]).filter(p => (p.text ?? "").trim().length > 0);
        load(tracks, 0);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load article");
      }
    })();
  }, [articleId, load]);

  // Token cache by paragraph id
  const tokenMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof tokenizeParagraph>>();
    for (const p of list) {
      map.set(p.id, tokenizeParagraph(p.text));
    }
    return map;
  }, [list]);

  // Build timings when duration changes or active track changes
  useEffect(() => {
    const track = list[activeIndex];
    if (!track || !hasMetadata) { setCurrentTimings(null); return; }
    const toks = tokenMap.get(track.id) ?? [];
    setCurrentTimings(mergeTimings(toks, undefined, duration));
    setNowPlaying(`Now playing paragraph ${activeIndex + 1}`);
  }, [list, activeIndex, hasMetadata, duration, tokenMap]);

  // Update active word index with current time
  useEffect(() => {
    if (!currentTimings) { setActiveWordIndex(null); return; }
    const idx = findActiveWordIndex(currentTimings, currentTime);
    setActiveWordIndex(idx);
  }, [currentTimings, currentTime]);

  // Scroll into view on paragraph change (suppress while scrubbing)
  useEffect(() => {
    if (isScrubbing) return;
    const track = list[activeIndex];
    if (!track) return;
    const el = document.getElementById(`para-${track.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, list, isScrubbing]);

  // Keyboard shortcuts scoped to this reader
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!hasFocus) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.code === "ArrowRight") { e.preventDefault(); next(); }
      if (e.code === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, next, prev, hasFocus]);

  if (!articleId) return <div className="p-6 text-red-600">Invalid article id.</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!article) return <div className="p-6">Loading…</div>;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
      className="container mx-auto p-4 space-y-4 outline-none"
    >
      <h1 className="text-2xl font-semibold">{article.title}</h1>

      <div className="rounded-2xl p-4 border shadow bg-white/5 flex items-center gap-3 sticky top-2 backdrop-blur">
        <audio ref={audioRef} preload="metadata" />
        <button
          onClick={toggle}
          className="px-3 py-1 rounded-2xl shadow border hover:shadow-lg"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        {!hasEverPlayed && (
          <span className="text-xs opacity-70">Click Play to start audio</span>
        )}
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress}
          onMouseDown={() => setIsScrubbing(true)}
          onTouchStart={() => setIsScrubbing(true)}
          onMouseUp={() => setIsScrubbing(false)}
          onTouchEnd={() => setIsScrubbing(false)}
          onChange={(e) => {
            const r = parseFloat(e.target.value);
            seek(r);
            if (currentTimings && duration) {
              const t = Math.max(0, Math.min(duration * r, duration - 0.01));
              const idx = findActiveWordIndex(currentTimings, t);
              setActiveWordIndex(idx);
            }
          }}
          className="w-full"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={progress}
          disabled={!hasMetadata}
        />
        <span className="w-32 text-right tabular-nums">
          {hasMetadata ? (
            `${formatTime(currentTime)} / ${formatTime(duration)}`
          ) : (
            "Loading audio…"
          )}
        </span>
        <button onClick={prev} className="px-2 py-1 border rounded" aria-label="Previous paragraph">⟨ Prev</button>
        <button onClick={next} className="px-2 py-1 border rounded" aria-label="Next paragraph">Next ⟩</button>
        <span className="sr-only" aria-live="polite">{nowPlaying}</span>
        {notice && (
          <span className="text-xs text-amber-700">{notice}</span>
        )}
      </div>

      <div className="space-y-6">
        {list.map((p, i) => (
          <div
            id={`para-${p.id}`}
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

