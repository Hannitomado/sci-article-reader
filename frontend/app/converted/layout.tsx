'use client';

export default function ConvertedLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-8 bg-gradient-to-br from-lilacMist via-lavenderHaze to-skyFade text-inkBlack font-sans transition-all duration-500 ease-in-out">
      <div className="animate-fadeIn max-w-5xl mx-auto rounded-3xl shadow-2xl bg-lavenderHaze/80 backdrop-blur-md p-8 sm:p-10 md:p-16 lg:p-20 xl:p-24 text-lg lg:text-xl">
        {children}
      </div>
    </main>
  );
}
