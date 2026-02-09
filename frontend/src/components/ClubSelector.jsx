import { useState, useRef, useEffect } from 'react';
import { useMode } from '../contexts/ModeContext';
import CLUBS, { getClubLogo, isMatchMode, parseMatchMode } from '../config/clubs';

function ClubSelector() {
  const { mode, setMode } = useMode();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Fermeture au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeClub = CLUBS.find(c => c.id === mode);
  const isLigue1 = mode === 'ligue1';
  const matchData = isMatchMode(mode) ? parseMatchMode(mode) : null;

  const handleSelect = (value) => {
    setMode(value);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-flex">
      {/* Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full
                   px-4 sm:px-5 py-1.5 sm:py-2
                   font-bold text-sm sm:text-base
                   hover:bg-white/15 transition-colors border border-white/10 cursor-pointer"
      >
        {isLigue1 ? (
          <span className="text-white">Toute la L1</span>
        ) : matchData ? (
          <>
            <img
              src={getClubLogo(matchData.homeClub.tmId)}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-white/50 text-xs">vs</span>
            <img
              src={getClubLogo(matchData.awayClub.tmId)}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </>
        ) : (
          <>
            <img
              src={getClubLogo(activeClub?.tmId)}
              alt=""
              className="w-5 h-5 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-white">{activeClub?.name}</span>
          </>
        )}
        <svg
          className={`w-3 h-3 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 max-w-[calc(100vw-2rem)] bg-fv-navy-light/95 backdrop-blur rounded-xl
                        shadow-lg border border-white/10 py-1 z-30 max-h-72 overflow-y-auto">
          {/* Option Toute la L1 */}
          <button
            onClick={() => handleSelect('ligue1')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors
                       ${isLigue1 ? 'text-fv-green' : 'text-white hover:bg-white/10'}`}
          >
            <span className="w-5 h-5 flex items-center justify-center text-base">L1</span>
            <span className="font-medium">Toute la L1</span>
          </button>

          <div className="border-t border-white/10 my-1" />

          {/* Clubs */}
          {CLUBS.map(club => (
            <button
              key={club.id}
              onClick={() => handleSelect(club.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors
                         ${mode === club.id ? 'text-fv-green' : 'text-white hover:bg-white/10'}`}
            >
              <img
                src={getClubLogo(club.tmId)}
                alt=""
                className="w-5 h-5 object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="font-medium">{club.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClubSelector;
