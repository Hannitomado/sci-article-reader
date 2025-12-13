"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAudioPlaylist } from "@/app/hooks/useAudioPlaylist";
import WordHighlighter from "@/app/components/WordHighlighter";
import { tokenizeParagraph, mergeTimings, findActiveWordIndex } from "@/app/lib/textTiming";
import { useParams, useRouter } from "next/navigation";

type Paragraph = {
  id: string;
  text: string;
  audio_url: string;
  task_id?: string;
};

type Article = { id: string; title: string; paragraphs: Paragraph[] };

type TaskStatus = "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY";

// Backend might return {state: "..."} instead of {status: "..."} so we accept both.
type TaskResp = {
  task_id?: string;
  status?: TaskStatus | string;
  state?: TaskStatus | string;
  result?: any;
};

function normalizeStatus(raw?: string | null): TaskStatus {
  const s = (raw ?? "").toUpperCase();
  if (s === "PENDING") return "PENDING";
  if (s === "STARTED") return "STARTED";
  if (s === "SUCCESS") return "SUCCESS";
  if (s === "FAILURE") return "FAILURE";
  if (s === "RETRY") return "RETRY";
  return "PENDING";
}

export default function ReaderPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string>("");
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentTimings, setCurrentTimings] = useState<ReturnType<typeof mergeTimings> | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasFocus, setHasFocus] = useState(false);

  // Task polling UI state
  const [taskStatusMap, setTaskStatusMap] = useState<Record<string, TaskStatus>>({});

  // Refs to avoid interval re-creation on every state update
  const articleRef = useRef<Article | null>(null);
  const statusRef = useRef<Record<string, TaskStatus>>({});

  const {
    audioRef,
    list,
    load,
    activeIndex,
    setIndex,
    isPlaying,
    toggle,
    progress,
    seek,
    currentTime,
    duration,
    next,
    prev,
    hasMetadata,
    hasEverPlayed,
    notice,
    setNotice,
  } = useAudioPlaylist();

  // Keep refs in sync with state
  useEffect(() => {
    articleRef.current = article;
  }, [article]);

  useEffect(() => {
    statusRef.current = taskStatusMap;
  }, [taskStatusMap]);

  // Fetch article and load tracks (skip empty text)
  useEffect(() => {
    if (!articleId) return;

    (async () => {
      try {
        const res = await fetch(`/api/article/${articleId}`);
        if (!res.ok) throw new Error(`Failed to load article (${res.status})`);
        const data = (await res.json()) as Article;

        setArticle(data);
        setError(null);

        const tracks = (data.paragraphs as Paragraph[]).filter(
          (p) => (p.text ?? "").trim().length > 0
        );

        load(tracks as any, 0);

        // Initialize statuses for paragraphs that have task_id
        const init: Record<string, TaskStatus> = {};
        for (const p of tracks) {
          if (p.task_id) init[p.id] = "PENDING";
        }
        setTaskStatusMap(init);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load article");
      }
    })();
  }, [articleId, load]);

  // Poll Celery task status and update audio URLs when ready
  useEffect(() => {
    if (!articleId) return;

    let alive = true;
    const intervalMs = 1500;

    const pollOnce = async () => {
      if (!alive) return;

      const a = articleRef.current;
      if (!a) return;

      // Only poll paragraphs that have task_id and are not SUCCESS/FAILURE yet
      const pendingParas = a.paragraphs.filter((p) => {
        if (!p.task_id) return false;
        const st = statusRef.current[p.id];
        return st !== "SUCCESS" && st !== "FAILURE";
      });

      if (pendingParas.length === 0) return;

      try {
        const results = await Promise.all(
          pendingParas.map(async (p) => {
            const res = await fetch(`/task_status/${p.task_id}`);
            if (!res.ok) throw new Error(`task_status failed (${res.status})`);
            const data: TaskResp = await res.json();

            // Accept either `status` or `state`
            const st = normalizeStatus((data.status as string) ?? (data.state as string));

            return { pid: p.id, para: p, status: st, result: data.result };
          })
        );

        if (!alive) return;

        // Update status map
        setTaskStatusMap((prev) => {
          const nextMap = { ...prev };
          for (const r of results) nextMap[r.pid] = r.status;
          return nextMap;
        });

        // If any succeeded and returned a file path, update the article audio_url to /static/<filename>
        const succeeded = results.filter(
          (r) => r.status === "SUCCESS" && r.result?.path
        );

        if (succeeded.length > 0) {
          setArticle((prev) => {
            if (!prev) return prev;

            const updated: Article = {
              ...prev,
              paragraphs: prev.paragraphs.map((pp) => ({ ...pp })),
            };

            for (const s of succeeded) {
              const outPath: string = s.result.path;
              const filename = outPath.split(/[/\\]+/).pop();
              if (!filename) continue;

              const newUrl = `/static/${filename}`;
              const idx = updated.paragraphs.findIndex((x) => x.id === s.pid);
              if (idx >= 0) updated.paragraphs[idx].audio_url = newUrl;
            }

            return updated;
          });

          // Refresh playlist tracks from the latest article (so new URLs are used)
          window.setTimeout(() => {
            const latest = articleRef.current;
            if (!latest) return;

            const tracks = latest.paragraphs.filter(
              (p) => (p.text ?? "").trim().length > 0
            );

            load(tracks as any, activeIndex);
          }, 0);
        }
      } catch (e) {
        console.warn("Task polling error:", e);
      }
    };

    const t = window.setInterval(pollOnce, intervalMs);
    pollOnce();

    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [articleId, load, activeIndex]);

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
    if (!track || !hasMetadata) {
      setCurrentTimings(null);
      return;
    }
    const toks = tokenMap.get(track.id) ?? [];
    setCurrentTimings(mergeTimings(toks, undefined, duration));
    setNowPlaying(`Now playing paragraph ${activeIndex + 1}`);
  }, [list, activeIndex, hasMetadata, duration, tokenMap]);

  // Update active word index with current time
  useEffect(() => {
    if (!currentTimings) {
      setActiveWordIndex(null);
      return;
    }
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
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        next();
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, next, prev, hasFocus]);

  if (!articleId) return <div className="p-6 text-red-600">Invalid article id.</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!article) return <div className="p-6">Loading…</div>;

  // Progress UI derived from tracked tasks
  const trackedCount = article.paragraphs.filter(
    (p) => (p.text ?? "").trim().length > 0 && p.task_id
  ).length;

  const doneCount = Object.values(taskStatusMap).filter((s) => s === "SUCCESS").length;
  const failCount = Object.values(taskStatusMap).filter((s) => s === "FAILURE").length;
  const pct = trackedCount > 0 ? Math.round((doneCount / trackedCount) * 100) : 100;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
      className="container mx-auto p-4 space-y-4 outline-none"
    >
      <h1 className="text-2xl font-semibold">{article.title}</h1>

      {/* Audio generation progress */}
      {trackedCount > 0 && (
        <div className="rounded-2xl p-4 border border-slateViolet/50 bg-[#f7f8fc] text-inkBlack">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Audio generation</span>
            <span className="tabular-nums">
              {doneCount}/{trackedCount} ready{failCount ? `, ${failCount} failed` : ""}
            </span>
          </div>
          <div className="h-2 w-full bg-black/10 rounded">
            <div className="h-2 rounded bg-black/40" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-xs opacity-70 mt-2">
            {pct < 100 ? "Generating audio in the background…" : "All audio ready."}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-4 border border-slateViolet/50 shadow bg-[#f7f8fc] text-inkBlack flex flex-wrap items-center gap-3 sticky top-2">
        <audio ref={audioRef} preload="metadata" />

        <button
          onClick={() => router.back()}
          className="px-3 py-1 rounded-2xl border shadow hover:shadow-lg"
          aria-label="Back"
        >
          Back
        </button>

        <button
          onClick={toggle}
          className="px-3 py-1 rounded-2xl shadow border hover:shadow-lg"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        {!hasEverPlayed && <span className="text-xs opacity-70">Click Play to start audio</span>}

        <button onClick={prev} className="px-2 py-1 border rounded" aria-label="Previous paragraph">
          ⟨ Prev
        </button>
        <button onClick={next} className="px-2 py-1 border rounded" aria-label="Next paragraph">
          Next ⟩
        </button>

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
          className="w-64 md:w-96"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={progress}
          disabled={!hasMetadata}
        />

        <span className="w-32 text-right tabular-nums ml-auto">
          {hasMetadata ? `${formatTime(currentTime)} / ${formatTime(duration)}` : "Loading audio…"}
        </span>

        <span className="sr-only" aria-live="polite">
          {nowPlaying}
        </span>

        {notice && <span className="text-xs text-amber-700">{notice}</span>}
      </div>

      <div className="space-y-6">
        {list.map((p, i) => {
          const status = taskStatusMap[p.id];
          const showBadge = Boolean(p.task_id);

          return (
            <div
              id={`para-${p.id}`}
              key={p.id}
              className={`rounded-2xl p-4 bg-[#f7f8fc] text-inkBlack shadow-sm ${
                i === activeIndex ? "ring-2 ring-blue-400" : "border border-slateViolet/50"
              }`}
              onClick={() => setIndex(i)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm opacity-60">Paragraph {i + 1}</div>

                {showBadge && (
                  <div className="text-xs px-2 py-1 rounded border opacity-80 tabular-nums">
                    {status ?? "PENDING"}
                  </div>
                )}
              </div>

              <WordHighlighter
                text={p.text}
                activeWordIndex={i === activeIndex ? activeWordIndex : null}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-center py-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-2xl border shadow hover:shadow-lg"
          aria-label="Back to previous"
        >
          Back
        </button>
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
