import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ShareCard from './ShareCard';
import { useStreak } from '../hooks/useStreak';
import { isLoggedIn } from '../lib/api';

export default function ResultsModal({ puzzle, solvedGroups, mistakes, solved, onClose }) {
  const { recordPlay, currentStreak } = useStreak();

  useEffect(() => {
    recordPlay(solved);
  }, [solved, recordPlay]);

  // Confetti on win (skip if user prefers reduced motion)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (solved && !prefersReducedMotion) {
      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7C4DFF', '#00E5FF', '#22C55E', '#EAB308'],
        });

        if (mistakes === 0) {
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.5 },
              colors: ['#7C4DFF', '#00E5FF', '#22C55E', '#EAB308'],
            });
          }, 500);
        }
      }).catch(() => {});
    }
  }, [solved, mistakes]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(15, 15, 20, 0.85)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={solved ? 'Puzzle complete' : 'Game over'}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm rounded-xl p-6 flex flex-col items-center gap-5 max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-surface)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 40px rgba(124, 77, 255, 0.08)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-center">
            <h2
              className="font-display text-[24px] font-extrabold"
              style={{ color: 'var(--text-primary)' }}
            >
              {solved
                ? mistakes === 0
                  ? 'Perfect!'
                  : 'Nice Work!'
                : 'Game Over'}
            </h2>
            <p
              className="text-[14px] mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {solved
                ? `Solved with ${mistakes} mistake${mistakes !== 1 ? 's' : ''}`
                : `${mistakes} mistakes — better luck tomorrow!`}
            </p>
          </div>

          {/* Streak display */}
          {currentStreak > 0 && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-tile"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              <span className="text-lg">🔥</span>
              <span
                className="text-[14px] font-semibold"
                style={{ color: 'var(--tier-gold)' }}
              >
                {currentStreak} day streak
              </span>
            </div>
          )}

          {/* Login prompt for anonymous users */}
          {!isLoggedIn() && (
            <a
              href={(() => {
                const apiUrl = window.tagConnections?.apiUrl || '';
                const siteRoot = apiUrl.split('/wp-json')[0];
                return `${siteRoot}/wp-login.php?redirect_to=${encodeURIComponent(window.location.href)}`;
              })()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-tile text-[13px] no-underline"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                className="font-semibold"
                style={{ color: 'var(--accent-secondary)' }}
              >
                Log in to save your streak across devices
              </span>
              <span
                className="ml-auto"
                style={{ color: 'var(--text-secondary)' }}
              >
                &rarr;
              </span>
            </a>
          )}

          {/* Share card */}
          <ShareCard
            puzzle={puzzle}
            solvedGroups={solvedGroups}
            mistakes={mistakes}
            solved={solved}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="text-[13px] font-normal mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
