import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '../contexts/ModeContext';
import PlayerCard from '../components/PlayerCard';
import PlayerCardSkeleton from '../components/PlayerCardSkeleton';
import VoteButtons from '../components/VoteButtons';
import { fetchRandomPlayer, submitVote } from '../utils/api';
import useSEO from '../hooks/useSEO';

const Confetti = lazy(() => import('../components/Confetti'));
const AdInterstitial = lazy(() => import('../components/AdInterstitial'));

const MILESTONES = {
  10: '10 votes ! Tu t\'es bien échauffé.',
  25: '25 votes ! Quelle aisance balle au pied.',
  50: '50 votes ! Ciseau-retourné.',
  100: '100 votes ! Quelle merveille !',
  250: '250 votes ! Mais où t\'arrêteras-tu ?',
  500: '500 votes ! Hall of Fame !',
};

// Interstitiel pub tous les 10 votes
const AD_INTERVAL = 10;

function Vote() {
  useSEO({
    title: 'Voter pour les joueurs | Topflop',
    description: 'Vote pour tes joueurs de Ligue 1 preferes : pouce haut, neutre ou pouce bas. Swipe ou clique pour donner ton avis.',
  });
  const navigate = useNavigate();
  const { mode, voteCount, incrementVoteCount } = useMode();
  const [stack, setStack] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [celebration, setCelebration] = useState({ trigger: 0, message: '' });
  const [exitDirection, setExitDirection] = useState(null);
  const [error, setError] = useState(null);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);

  const votedIdsRef = useRef([]);
  const isVotingRef = useRef(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const milestoneRef = useRef(null);
  const dragRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef(null);

  // Focus "Continuer" button when milestone modal opens
  useEffect(() => {
    if (showMilestone && milestoneRef.current) {
      milestoneRef.current.focus();
    }
  }, [showMilestone]);

  // Reset card styles when milestone/ad modal is dismissed
  useEffect(() => {
    if (!showMilestone && !showAd && cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.transition = '';
      const indicator = cardRef.current.querySelector('[data-drag-indicator]');
      if (indicator) indicator.style.boxShadow = 'none';
      isDragging.current = false;
      dragRef.current = { x: 0, y: 0 };
    }
  }, [showMilestone, showAd]);

  const SWIPE_THRESHOLD_X = 80;
  const SWIPE_THRESHOLD_Y = 60;

  const applyDragTransform = useCallback((x, y, snap = false) => {
    const el = cardRef.current;
    if (!el) return;
    if (snap) {
      el.style.transition = 'transform 0.3s ease';
    } else {
      el.style.transition = 'none';
    }
    el.style.transform = `translateX(${x}px) translateY(${y}px) rotate(${x * 0.1}deg)`;
    // Update drag indicator opacity
    const indicator = el.querySelector('[data-drag-indicator]');
    if (indicator) {
      const absX = Math.abs(x);
      const absY = Math.abs(y);
      if (x === 0 && y === 0) {
        indicator.style.boxShadow = 'none';
      } else if (absX > absY) {
        const intensity = Math.min(absX / SWIPE_THRESHOLD_X, 1) * 0.6;
        const radius = Math.min(absX * 0.4, 30);
        indicator.style.boxShadow = x > 0
          ? `inset 0 0 ${radius}px rgba(16, 185, 129, ${intensity})`
          : `inset 0 0 ${radius}px rgba(239, 68, 68, ${intensity})`;
      } else if (y > 0) {
        const intensity = Math.min(y / SWIPE_THRESHOLD_Y, 1) * 0.4;
        const radius = Math.min(y * 0.4, 30);
        indicator.style.boxShadow = `inset 0 0 ${radius}px rgba(255, 255, 255, ${intensity})`;
      } else {
        indicator.style.boxShadow = 'none';
      }
    }
  }, []);

  const handleTouchStart = (e) => {
    if (exitDirection || showMilestone) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    isDragging.current = true;
    setIsDraggingState(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || exitDirection) return;
    const touch = e.touches[0];
    const x = touch.clientX - touchStart.current.x;
    const y = touch.clientY - touchStart.current.y;
    dragRef.current = { x, y };
    applyDragTransform(x, y);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || exitDirection) return;
    isDragging.current = false;
    setIsDraggingState(false);
    const { x, y } = dragRef.current;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    // Determine dominant direction
    if (absX > absY && absX > SWIPE_THRESHOLD_X) {
      dragRef.current = { x: 0, y: 0 };
      handleVote(x > 0 ? 'up' : 'down');
    } else if (absY > absX && y > SWIPE_THRESHOLD_Y) {
      dragRef.current = { x: 0, y: 0 };
      handleVote('neutral');
    } else {
      // Snap back
      dragRef.current = { x: 0, y: 0 };
      applyDragTransform(0, 0, true);
    }
  };

  // Charger les 2 premiers joueurs au montage / changement de mode
  useEffect(() => {
    const init = async () => {
      votedIdsRef.current = [];
      setStack([]);
      setInitialLoading(true);
      setError(null);
      try {
        const first = await fetchRandomPlayer(mode, []);
        // Charger le 2e en parallèle sans bloquer l'affichage
        setStack([first]);
        setInitialLoading(false);
        const second = await fetchRandomPlayer(mode, [first.id]);
        setStack([first, second]);
      } catch (err) {
        console.error('Erreur chargement joueurs:', err);
        setError('Impossible de charger les joueurs. Vérifie que le backend est démarré.');
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [mode]);

  const handleVote = (voteType) => {
    if (stack.length === 0 || isVotingRef.current || showMilestone) return;
    isVotingRef.current = true;

    const currentPlayer = stack[0];
    const direction = voteType === 'up' ? 'right' : voteType === 'down' ? 'left' : 'down';
    dragRef.current = { x: 0, y: 0 };
    setIsDraggingState(false);
    // Reset inline styles from drag before exit animation
    if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.transition = '';
      const indicator = cardRef.current.querySelector('[data-drag-indicator]');
      if (indicator) indicator.style.boxShadow = 'none';
    }
    setExitDirection(direction);

    // Update optimiste : on n'attend pas la réponse API
    submitVote(currentPlayer.id, voteType, mode).catch(err => {
      console.error('Erreur vote:', err);
    });

    const newCount = voteCount + 1;
    incrementVoteCount();
    votedIdsRef.current = [...votedIdsRef.current, currentPlayer.id];

    if (MILESTONES[newCount]) {
      setCelebration({ trigger: Date.now(), message: MILESTONES[newCount] });
      setShowMilestone(true);
    }

    // Afficher pub tous les 10 votes (seulement si pas de milestone)
    if (newCount % AD_INTERVAL === 0 && !MILESTONES[newCount]) {
      setTimeout(() => setShowAd(true), 300);
    }

    // Attendre la fin de l'animation de sortie (250ms)
    setTimeout(() => {
      isVotingRef.current = false;
      setExitDirection(null);
      // Reset inline styles for incoming card
      if (cardRef.current) {
        cardRef.current.style.transform = '';
        cardRef.current.style.transition = '';
      }
      setStack(prev => prev.slice(1));

      // Charger le prochain joueur en arrière-plan
      const remainingIds = stack.slice(1).map(p => p.id);
      fetchRandomPlayer(mode, [...votedIdsRef.current, ...remainingIds])
        .then(newPlayer => {
          if (newPlayer) {
            setStack(prev => [...prev, newPlayer]);
          }
        })
        .catch(() => {});
    }, 250);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleVote('up');
      else if (e.key === 'ArrowDown') handleVote('neutral');
      else if (e.key === 'ArrowLeft') handleVote('down');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stack, exitDirection, showMilestone]);

  const bgStyle = 'bg-vibes';
  const currentPlayer = stack[0];
  const nextPlayer = stack[1];
  return (
    <section className={`h-dvh h-screen pt-20 pb-24 sm:pb-4 ${bgStyle} px-4 flex flex-col justify-center`}>
      {showMilestone && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center pt-20"
          role="dialog"
          aria-modal="true"
          aria-label="Milestone atteint"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowMilestone(false); }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-6 text-center max-w-xs mx-4 animate-bounce-in shadow-material-4">
            <p className="text-2xl font-heading font-extrabold text-fv-navy">{celebration.message}</p>
            <div className="flex gap-3 mt-5 justify-center">
              <button onClick={() => navigate('/classement')}
                className="px-5 py-2.5 rounded-full border border-fv-navy/30 text-fv-navy font-bold text-sm
                           hover:bg-fv-navy/10 transition-colors">
                Classement
              </button>
              <button ref={milestoneRef} onClick={() => setShowMilestone(false)}
                className="px-5 py-2.5 rounded-full bg-fv-green text-fv-navy font-bold text-sm
                           hover:bg-fv-green-dark transition-colors">
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
      <Suspense fallback={null}>
        <Confetti
          trigger={celebration.trigger}
          message={celebration.message}
        />
        <AdInterstitial
          isOpen={showAd}
          onClose={() => setShowAd(false)}
          slot="VOTE_INTERSTITIAL_SLOT"
        />
      </Suspense>
      <div className="max-w-sm mx-auto w-full">
        {error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-fv-green text-fv-navy font-bold px-6 py-2 rounded-full hover:bg-fv-green-dark transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : initialLoading || !currentPlayer ? (
          <PlayerCardSkeleton />
        ) : (
          <div className="relative">
            {/* Pile de cartes */}
            <div className="relative">
              {/* Carte du dessous (joueur suivant) - absolute derrière, visible seulement pendant l'exit */}
              {nextPlayer && (
                <div className={`absolute inset-x-0 top-0 transition-opacity duration-150 ${exitDirection || isDraggingState ? 'opacity-100' : 'opacity-0'}`}>
                  <PlayerCard
                    key={nextPlayer.id}
                    player={nextPlayer}
                    voteCount={nextPlayer.total_votes}
                  />
                </div>
              )}

              {/* Carte du dessus (joueur actuel) - relative, maintient la taille */}
              <div
                ref={cardRef}
                className="relative z-10 touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Indicateur visuel de direction pendant le drag (manipule via ref) */}
                <div
                  data-drag-indicator
                  className="absolute inset-0 z-20 rounded-2xl pointer-events-none"
                  style={{ boxShadow: 'none' }}
                />
                <PlayerCard
                  key={currentPlayer.id}
                  player={currentPlayer}
                  exitDirection={exitDirection}
                  voteCount={currentPlayer.total_votes}
                />
              </div>
            </div>

            <VoteButtons onVote={handleVote} disabled={!!exitDirection} />

            <p className="text-center text-white/60 text-sm mt-4">
              Mes votes : {voteCount}
            </p>

            <p className="sm:hidden text-center text-white/60 text-xs mt-4">
              Swipe la carte pour voter
            </p>
            <p className="hidden sm:block text-center text-white/60 text-xs mt-4">
              ← → pour voter · ↓ pour neutre
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Vote;
