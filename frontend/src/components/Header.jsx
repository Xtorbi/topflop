import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ClubSelector from './ClubSelector';

function Header() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const isVotePage = location.pathname === '/vote';
  const [scrolled, setScrolled] = useState(!isHomePage);

  useEffect(() => {
    // Pages without a hero sentinel: always scrolled
    if (!isHomePage) {
      setScrolled(true);
      return;
    }

    // Home page: use IntersectionObserver on #hero-sentinel
    setScrolled(false);
    const sentinel = document.getElementById('hero-sentinel');
    if (!sentinel) {
      setScrolled(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isHomePage]);

  const isRankingPage = location.pathname === '/classement';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[400ms] ease-out
        ${isHomePage && !scrolled
          ? '-translate-y-full'
          : 'translate-y-0 bg-fv-navy/95 backdrop-blur-md border-b border-white/10'}`}
    >
      <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-4xl">
        <Link to="/" className="group">
          <img
            src="/logo.png"
            alt="Topflop"
            className="h-8 sm:h-10 group-hover:brightness-125 transition-all"
          />
        </Link>

        {isVotePage ? (
          <div className="flex items-center gap-2">
            <ClubSelector />
            <Link
              to="/classement"
              className="text-white/70 hover:text-white font-bold text-sm px-5 py-2.5 rounded-full
                         border border-white/30 hover:border-white/60 transition-all min-h-[44px] flex items-center"
            >
              <span className="sm:hidden">Top</span>
              <span className="hidden sm:inline">Classement</span>
            </Link>
          </div>
        ) : (
          <div className="flex gap-3">
            {!isRankingPage && (
              <Link
                to="/classement"
                className="text-white/70 hover:text-white font-bold text-sm px-5 py-2.5 rounded-full
                           border border-white/30 hover:border-white/60 transition-all min-h-[44px] flex items-center"
              >
                Classement
              </Link>
            )}
            <Link
              to="/vote"
              className="bg-fv-green text-fv-navy font-bold text-sm px-5 py-2.5 rounded-full
                         hover:bg-fv-green-dark transition-all min-h-[44px] flex items-center"
            >
              Voter
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
