import { useNavigate } from 'react-router-dom';
import { useMode } from '../contexts/ModeContext';
import CLUBS, { getClubLogo } from '../config/clubs';

function ClubGrid() {
  const navigate = useNavigate();
  const { mode, setMode } = useMode();

  const handleClubClick = (clubId) => {
    setMode(clubId);
    navigate('/vote');
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
      {CLUBS.map((club, index) => (
        <button
          key={club.id}
          onClick={() => handleClubClick(club.id)}
          style={{
            animationDelay: `${index * 25}ms`,
            animationFillMode: 'backwards',
          }}
          className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4
                     backdrop-blur-sm rounded-2xl
                     hover:bg-white/15
                     hover:scale-105 active:scale-95
                     transition-all duration-200 animate-fade-in-up
                     ${mode === club.id ? 'bg-white/20 ring-2 ring-fv-green' : 'bg-white/10'}`}
        >
          <img
            src={getClubLogo(club.tmId)}
            alt={club.name}
            width="48"
            height="48"
            className="w-12 h-12 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="text-white font-semibold text-sm">{club.name}</span>
        </button>
      ))}
    </div>
  );
}

export default ClubGrid;
