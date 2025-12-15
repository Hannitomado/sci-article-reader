"use client";

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      {/* Identity */}
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Ondu
        </h1>

        {/* Function label (Japanese) */}
        <div className="text-xl sm:text-2xl font-semibold tracking-tight text-[color:color-mix(in_srgb,var(--text-primary)_85%,transparent)]">
          音読
        </div>
      </div>

      {/* Functional description (Option B) */}
      <p className="mt-5 text-sm sm:text-base text-[color:var(--text-secondary)] leading-relaxed">
        A device for reading text aloud,
        <br />
        one paragraph at a time.
      </p>

      {/* Primary action */}
      <div className="mt-8">
        <button
          onClick={onNext}
          className={[
            "inline-flex items-center justify-center",
            "rounded-2xl border border-[color:var(--border)]",
            "px-6 py-3 min-h-[44px]",
            "text-sm sm:text-base font-semibold",
            "bg-[color:color-mix(in_srgb,var(--surface)_82%,transparent)]",
            "hover:bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)]",
            "active:translate-y-[1px]",
            "transition",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--ring)]",
          ].join(" ")}
          aria-label="Upload text"
        >
          Upload text
        </button>

        <div className="mt-3 text-xs sm:text-sm text-[color:var(--text-tertiary)]">
          Paste text or upload a file.
        </div>
      </div>
    </div>
  );
}
