import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ModeProvider } from './contexts/ModeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Vote from './pages/Vote';
import Ranking from './pages/Ranking';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import CookieBanner from './components/CookieBanner';
import { Analytics } from '@vercel/analytics/react';

function AppContent() {
  const location = useLocation();
  const isVotePage = location.pathname === '/vote';
  const [cookieConsent, setCookieConsent] = useState(
    () => localStorage.getItem('fv-cookie-consent') === 'accepted'
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Ecouter les changements de consentement (depuis CookieBanner)
  useEffect(() => {
    const onStorage = () => {
      setCookieConsent(localStorage.getItem('fv-cookie-consent') === 'accepted');
    };
    window.addEventListener('storage', onStorage);
    // Check aussi au focus (meme onglet)
    const onFocus = () => onStorage();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1629] overflow-x-hidden">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/classement" element={<Ranking />} />
          <Route path="/confidentialite" element={<Privacy />} />
          <Route path="/cgu" element={<Terms />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isVotePage && <Footer />}
      <CookieBanner onConsentChange={setCookieConsent} />
      {cookieConsent && <Analytics />}
    </div>
  );
}

function App() {
  return (
    <ModeProvider>
      <AppContent />
    </ModeProvider>
  );
}

export default App;
