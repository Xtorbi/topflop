import { useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'fv-cookie-consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => {
    return !localStorage.getItem(STORAGE_KEY);
  });

  if (!visible) return null;

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  }

  function handleRefuse() {
    localStorage.setItem(STORAGE_KEY, 'refused');
    setVisible(false);
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-3 py-3 sm:p-4 bg-[#1a2340]/95 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-sm text-white/80">
        <p className="flex-1 text-center sm:text-left">
          Ce site utilise des cookies pour améliorer votre expérience et afficher des publicités personnalisées.{' '}
          <Link to="/confidentialite" className="underline text-emerald-400 hover:text-emerald-300">
            En savoir plus
          </Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleRefuse}
            className="px-4 py-2 rounded-lg border border-white/30 text-white/80 hover:bg-white/10 transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
