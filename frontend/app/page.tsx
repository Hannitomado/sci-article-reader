'use client';

import { useState } from 'react';
import WelcomeScreen from './screens/WelcomeScreen';
import MainMenu from './screens/MainMenu';
import UploadScreen from './screens/UploadScreen';
import ReaderScreen from './screens/ReaderScreen';
import DeleteScreen from './screens/DeleteScreen';
import ArticleListScreen from './screens/ArticleListScreen';

export default function Home() {
  const [screen, setScreen] = useState('welcome');

  const renderScreen = () => {
    switch (screen) {
      case 'welcome':
        return <WelcomeScreen onNext={() => setScreen('main')} />;
      case 'main':
        return <MainMenu onNavigate={setScreen} />;
      case 'upload':
        return <UploadScreen onBack={() => setScreen('main')} />;
      case 'reader':
        return <ReaderScreen onBack={() => setScreen('main')} />;
      case 'delete':
        return <DeleteScreen onBack={() => setScreen('main')} />;
      case 'list':
        return <ArticleListScreen onBack={() => setScreen('main')} />;
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 bg-gradient-to-br from-pink-100 via-yellow-100 to-teal-100 text-slate-800 font-sans transition-all duration-500 ease-in-out">
      <div className="animate-fadeIn max-w-5xl mx-auto rounded-3xl shadow-2xl bg-white/70 backdrop-blur-md p-8 sm:p-10 md:p-16 lg:p-20 xl:p-24 text-lg lg:text-xl">
        {renderScreen()}
      </div>
    </main>
  );
}
