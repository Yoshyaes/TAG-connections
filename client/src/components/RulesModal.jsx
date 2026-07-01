import { motion, AnimatePresence } from 'framer-motion';

export default function RulesModal({ onClose }) {
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
        aria-label="How to play"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm rounded-xl p-6 flex flex-col items-center gap-4 max-h-[90vh] overflow-y-auto"
          style={{
            backgroundColor: 'var(--bg-surface)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 40px rgba(124, 77, 255, 0.08)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2
            className="font-display text-[22px] font-extrabold text-center"
            style={{ color: 'var(--text-primary)' }}
          >
            How to play
          </h2>

          <p
            className="text-[14px] text-center leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sort 16 items into 4 secret groups of 4. Tap items to select them,
            then Submit. 4 mistakes and it's game over.
          </p>

          <div
            className="w-full flex flex-col gap-2 text-[13px] text-left"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div className="flex items-center gap-2">
              <span>🟢</span><span>Straightforward</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔵</span><span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟣</span><span>Tricky</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟡</span><span>Devious</span>
            </div>
          </div>

          <p
            className="text-[12px] text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            Categories can overlap on purpose &mdash; the fun is figuring out
            which group an item actually belongs to.
          </p>

          <button
            onClick={onClose}
            className="px-8 py-3 rounded-tile text-[14px] font-semibold mt-1"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
          >
            Got it
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
