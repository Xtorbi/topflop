import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '../contexts/ModeContext';
import { fetchRecentMatches } from '../utils/api';
import CLUBS, { getClubIdFromName, CLUB_LOGOS } from '../config/clubs';

function getShortName(clubName) {
  const id = getClubIdFromName(clubName);
  if (!id) return clubName;
  const club = CLUBS.find(c => c.id === id);
  return club?.name || clubName;
}

function formatDate(date) {
  const days = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
  const months = ['jan.', 'fev.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.'];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatMatchInfo(match) {
  const date = new Date(match.match_date);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (match.status === 'FINISHED') {
    return {
      display: `${match.home_score} - ${match.away_score}`,
      isToday,
      dateLabel: isToday ? "Aujourd'hui" : formatDate(date),
    };
  }

  // Match programmé : afficher l'heure de coup d'envoi
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return {
    display: `${hours}:${minutes}`,
    isToday,
    dateLabel: isToday ? "Aujourd'hui" : formatDate(date),
    isUpcoming: true,
  };
}

function MatchGrid() {
  const navigate = useNavigate();
  const { setMode } = useMode();
  const [matches, setMatches] = useState([]);
  const [matchday, setMatchday] = useState(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetchRecentMatches()
      .then(data => {
        setMatches(data.matches || []);
        setMatchday(data.matchday);
      })
      .catch(err => console.error('[MatchGrid] fetch failed', err))
      .finally(() => setLoading(false));
  }, []);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    // Petit délai pour que le DOM soit rendu
    const t = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', checkScroll);
    };
  }, [matches]);

  if (!loading && matches.length === 0) return null;

  if (loading) {
    return (
      <>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/60 text-sm font-medium">ou vote sur un match</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <div className="flex gap-2 sm:gap-3 overflow-hidden pb-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 bg-white/5 rounded-2xl px-5 py-4 min-w-[190px] animate-pulse">
              <div className="h-3 bg-white/10 rounded w-16 mx-auto mb-3" />
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full" />
                <div className="h-5 bg-white/10 rounded w-10" />
                <div className="w-8 h-8 bg-white/10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: direction * 220, behavior: 'smooth' });
    }
  };

  const handleMatchClick = (match) => {
    const homeId = getClubIdFromName(match.home_club);
    const awayId = getClubIdFromName(match.away_club);
    if (homeId && awayId) {
      setMode(`match:${homeId}:${awayId}`);
      navigate('/vote');
    }
  };

  return (
    <>
      {/* Separateur */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/60 text-sm font-medium">ou vote sur un match</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Header journée + flèches */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white/80 text-sm font-bold tracking-wide">
          {matchday}<sup>ème</sup> journée
        </h3>
        <div className="hidden sm:flex gap-1">
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            aria-label="Journée précédente"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
                       hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            aria-label="Journée suivante"
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
                       hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Carrousel */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
      >
        {matches.map(match => {
          const info = formatMatchInfo(match);
          return (
            <button
              key={match.id}
              onClick={() => handleMatchClick(match)}
              className={`flex-shrink-0 snap-start bg-white/10 backdrop-blur-sm rounded-2xl
                         px-3 sm:px-5 py-3 sm:py-4 min-w-[160px] sm:min-w-[190px]
                         border-2 hover:bg-white/15 hover:border-fv-green/60 active:scale-95
                         transition-colors duration-200
                         ${info.isToday ? 'border-fv-green/30' : 'border-transparent'}`}
            >
              {/* Date */}
              <p className={`text-[10px] text-center mb-3 uppercase tracking-wider
                ${info.isToday ? 'text-fv-green/70' : 'text-white/60'}`}>
                {info.dateLabel}
              </p>

              {/* Logos + Score/Heure */}
              <div className="flex items-start justify-center gap-3">
                {/* Home */}
                <div className="flex flex-col items-center gap-1.5 w-14">
                  <img
                    src={CLUB_LOGOS[match.home_club]}
                    alt={getShortName(match.home_club)}
                    width="32"
                    height="32"
                    className="w-8 h-8 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-white/70 text-[10px] font-medium text-center leading-tight truncate w-full">
                    {getShortName(match.home_club)}
                  </span>
                </div>

                {/* Score ou heure — aligné verticalement avec les logos (h-8 = 32px) */}
                <span className={`font-bold tabular-nums min-w-[40px] text-center h-8 flex items-center justify-center
                  ${info.isUpcoming ? 'text-white/50 text-base' : 'text-white text-lg'}`}>
                  {info.display}
                </span>

                {/* Away */}
                <div className="flex flex-col items-center gap-1.5 w-14">
                  <img
                    src={CLUB_LOGOS[match.away_club]}
                    alt={getShortName(match.away_club)}
                    width="32"
                    height="32"
                    className="w-8 h-8 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-white/70 text-[10px] font-medium text-center leading-tight truncate w-full">
                    {getShortName(match.away_club)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

export default MatchGrid;
