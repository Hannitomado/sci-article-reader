'use client'

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-4xl font-bold">Ondu</h1>
      <p className="text-2xl font-medium text-coralGlow">Clean the clutter, hear the prattle.</p>
      <button
        onClick={onNext}
        className="px-5 py-2 rounded-md border border-slateViolet bg-lilacMist hover:bg-duskBlue text-inkBlack font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inkBlack/30 min-h-[44px] min-w-[44px]"
        aria-label="Start"
      >
        Start
      </button>
    </div>
  );
}
