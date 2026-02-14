import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMode } from '../contexts/ModeContext';
import ClubGrid from '../components/ClubGrid';
import MatchGrid from '../components/MatchGrid';
import MiniPodium from '../components/MiniPodium';
import AdBanner from '../components/AdBanner';
import { fetchRanking } from '../utils/api';
import useSEO from '../hooks/useSEO';

function Home() {
  useSEO({
    title: 'Topflop — Le barometre des joueurs de Ligue 1',
    description: 'Vote pour tes joueurs de Ligue 1 preferes et decouvre le classement communautaire base sur le ressenti des fans.',
  });
  const navigate = useNavigate();
  const { setMode } = useMode();
  const [topPlayers, setTopPlayers] = useState(null);

  useEffect(() => {
    fetchRanking({ limit: 3 })
      .then(data => {
        if (data.players && data.players.length >= 3) {
          setTopPlayers(data.players);
        }
      })
      .catch(err => console.error('[Home] ranking fetch failed', err));
  }, []);

  const handleLigue1 = () => {
    setMode('ligue1');
    navigate('/vote');
  };

  return (
    <section className="min-h-screen bg-vibes">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-4xl">
        <div id="hero-sentinel" className="h-px" />
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in-up pt-10">
          {/* Logo TOPFLOP */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="Topflop"
              className="w-48 sm:w-56 md:w-64"
            />
          </div>

          {/* Tagline */}
          <p className="text-white/80 text-base sm:text-xl mb-2">
            Le baromètre des joueurs de Ligue 1
          </p>
          <p className="text-white/60 text-xs sm:text-sm mb-8">
            Vote et découvre le classement · Saison 2025-2026
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <button
              onClick={handleLigue1}
              className="bg-fv-green text-fv-navy font-bold
                         px-8 py-4 rounded-full text-lg
                         hover:bg-fv-green-dark hover:scale-105
                         active:scale-95 transition-all duration-200
                         inline-flex items-center gap-2 shadow-lg"
            >
              Commencer à voter
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <Link
              to="/classement"
              className="text-white/70 hover:text-white font-bold text-lg
                         px-8 py-4 rounded-full border border-white/20 hover:border-white/40
                         transition-all duration-200"
            >
              Voir le classement
            </Link>
          </div>
        </div>

        {/* Mini Podium Top 3 */}
        {topPlayers ? (
          <div className="mb-8">
            <MiniPodium players={topPlayers} />
          </div>
        ) : (
          <div className="mb-8 bg-white/5 rounded-2xl border border-white/10 px-4 py-6 sm:px-8 sm:py-8 animate-pulse">
            <div className="h-5 bg-white/10 rounded w-40 mx-auto mb-6" />
            <div className="flex justify-center items-end gap-4 sm:gap-8">
              {[2, 1, 3].map(r => (
                <div key={r} className={`flex flex-col items-center ${r !== 1 ? 'mt-6' : ''}`}>
                  <div className="w-6 h-6 bg-white/10 rounded-full mb-2" />
                  <div className={`${r === 1 ? 'w-20 h-20' : 'w-16 h-16'} bg-white/10 rounded-full`} />
                  <div className="h-3 bg-white/10 rounded w-12 mt-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matchs récents */}
        <div className="mb-8">
          <MatchGrid />
        </div>

        {/* Séparateur */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/60 text-sm font-medium">ou vote par club</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Clubs Grid */}
        <ClubGrid />

        {/* Banner publicitaire */}
        <div className="mt-8">
          <AdBanner slot="HOME_BANNER_SLOT" format="leaderboard" className="hidden sm:flex" />
          <AdBanner slot="HOME_BANNER_SLOT" format="banner" className="flex sm:hidden" />
        </div>
      </div>
    </section>
  );
}

export default Home;
