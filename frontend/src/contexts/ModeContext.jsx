import { createContext, useContext, useState, useEffect } from 'react';

const ModeContext = createContext();

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return typeof window === 'undefined' ? 'ligue1' : (localStorage.getItem('fv-mode') || 'ligue1');
  });

  const [voteCount, setVoteCount] = useState(() => {
    return typeof window === 'undefined' ? 0 : parseInt(localStorage.getItem('fv-vote-count') || '0', 10);
  });

  useEffect(() => {
    localStorage.setItem('fv-mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('fv-vote-count', String(voteCount));
  }, [voteCount]);

  const incrementVoteCount = () => setVoteCount(prev => prev + 1);

  return (
    <ModeContext.Provider value={{ mode, setMode, voteCount, incrementVoteCount }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
