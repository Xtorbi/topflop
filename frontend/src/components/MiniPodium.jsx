import { Link } from 'react-router-dom';
import { CLUB_LOGOS } from '../config/clubs';

function formatShortName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  const lastName = parts[parts.length - 1];
  const firstInitial = parts[0][0] + '.';
  return `${firstInitial} ${lastName}`;
}

function PodiumPlayer({ player, rank }) {
  const isFirst = rank === 1;
  const photoSize = isFirst ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-16 h-16 sm:w-20 sm:h-20';
  const borderOpacity = rank === 1 ? 'border-emerald-400' : rank === 2 ? 'border-emerald-400/70' : 'border-emerald-400/40';
  const textSize = isFirst ? 'text-sm sm:text-base' : 'text-xs sm:text-sm';
  const clubLogo = CLUB_LOGOS[player.club];
  const scoreNum = player.score || 0;
  const scoreColor = scoreNum > 0 ? 'text-emerald-400' : scoreNum < 0 ? 'text-red-400' : 'text-white/60';
  const scorePrefix = scoreNum > 0 ? '+' : '';

  return (
    <div className={`flex flex-col items-center ${isFirst ? 'order-2' : rank === 2 ? 'order-1 mt-6 sm:mt-8' : 'order-3 mt-6 sm:mt-8'}`}>
      {/* Rank badge */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-2
        ${rank === 1 ? 'bg-emerald-500 text-white' : rank === 2 ? 'bg-emerald-500/70 text-white' : 'bg-emerald-500/40 text-white'}`}>
        {rank}
      </div>

      {/* Photo */}
      <div className={`${photoSize} rounded-full overflow-hidden border-2 ${borderOpacity} bg-white/10`}>
        {player.photo_url ? (
          <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        )}
      </div>

      {/* Name */}
      <p className={`${textSize} font-bold text-white mt-2 text-center leading-tight`}>
        {formatShortName(player.name)}
      </p>

      {/* Club logo */}
      {clubLogo && (
        <img src={clubLogo} alt={player.club} className="w-4 h-4 sm:w-5 sm:h-5 mt-1 object-contain" />
      )}

      {/* Score */}
      <span className={`${scoreColor} text-xs sm:text-sm font-bold mt-1`}>
        {scorePrefix}{scoreNum}
      </span>
    </div>
  );
}

export default function MiniPodium({ players }) {
  if (!players || players.length < 3) return null;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 px-4 py-6 sm:px-8 sm:py-8">
      {/* Title */}
      <h2 className="font-heading text-white text-center text-lg sm:text-xl tracking-wide mb-6">
        Top 3 du moment
      </h2>

      {/* Podium */}
      <div className="flex justify-center items-end gap-4 sm:gap-8">
        <PodiumPlayer player={players[1]} rank={2} />
        <PodiumPlayer player={players[0]} rank={1} />
        <PodiumPlayer player={players[2]} rank={3} />
      </div>

      {/* Link */}
      <div className="text-center mt-6">
        <Link
          to="/classement"
          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors inline-flex items-center gap-1"
        >
          Voir le classement
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
