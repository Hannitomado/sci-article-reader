'use client'

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <h1 className="text-4xl font-bold">🧠 Scientific Article Reader</h1>
      <p className="text-lg">Upload and listen to your cleaned research papers.</p>
      <button onClick={onNext} className="btn">Start</button>
    </div>
  );
}