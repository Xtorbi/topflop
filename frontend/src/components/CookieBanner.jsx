import { useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'fv-cookie-consent';
const CONSENT_DATE_KEY = 'fv-cookie-consent-date';
const CONSENT_MAX_DAYS = 395; // ~13 mois

function isConsentExpired() {
  const dateStr = localStorage.getItem(CONSENT_DATE_KEY);
  if (!dateStr) return true;
  const consentDate = new Date(dateStr);
  const daysSince = (Date.now() - consentDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > CONSENT_MAX_DAYS;
}

export function resetCookieConsent() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CONSENT_DATE_KEY);
  window.location.reload();
}

export default function CookieBanner({ onConsentChange }) {
  const [visible, setVisible] = useState(() => {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) return true;
    if (isConsentExpired()) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONSENT_DATE_KEY);
      return true;
    }
    return false;
  });

  if (!visible) return null;

  function handleAccept() {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
    setVisible(false);
    onConsentChange?.(true);
  }

  function handleRefuse() {
    localStorage.setItem(STORAGE_KEY, 'refused');
    localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
    setVisible(false);
    onConsentChange?.(false);
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-3 py-3 sm:p-4 bg-[#1a2340]/95 backdrop-blur-sm border-t border-white/10">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-sm text-white/80">
        <p className="flex-1 text-center sm:text-left">
          Ce site utilise des cookies pour afficher des publicites (Google AdSense) et mesurer l'audience (Vercel Analytics).{' '}
          <Link to="/confidentialite" className="underline text-emerald-400 hover:text-emerald-300">
            En savoir plus
          </Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleRefuse}
            className="px-4 py-2 rounded-full border border-white/20 text-white/70 hover:bg-white/10 transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-full bg-fv-green text-fv-navy font-bold hover:bg-fv-green-dark transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
