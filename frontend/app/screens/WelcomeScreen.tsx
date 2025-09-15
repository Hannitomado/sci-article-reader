'use client'

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-4xl font-bold">Ondu</h1>
      <p className="text-lg">Clean your clutter, hear the prattle.</p>
      <button onClick={onNext} className="btn">Start</button>
    </div>
  );
}

