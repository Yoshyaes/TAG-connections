import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArchiveIndex } from '../lib/api';

function formatDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Archive() {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchArchiveIndex()
      .then(data => {
        if (cancelled) return;
        setState({ status: 'ready', ...data });
      })
      .catch(err => {
        if (cancelled) return;
        setState({ status: 'error', message: err.message });
      });
    return () => { cancelled = true; };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Loading archive...
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {`Error: ${state.message}`}
        </div>
      </div>
    );
  }

  const { entries = [], pro_required: proRequired, upgrade_url: upgradeUrl } = state;

  return (
    <div className="w-full max-w-game mx-auto px-4 py-6 flex flex-col gap-4">
      <header className="flex flex-col items-center gap-2 mb-2">
        <h1 className="font-display text-[24px] font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Puzzle Archive
        </h1>
        <p className="text-[13px] text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>
          Every past TAG Connections puzzle. Replay any you missed.
        </p>
        <Link to="/" className="text-[13px] underline" style={{ color: 'var(--text-secondary)' }}>
          Back to today's puzzle
        </Link>
      </header>

      {proRequired && (
        <div
          className="w-full rounded-tile px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          style={{
            background: 'linear-gradient(90deg, rgba(124,77,255,0.18), rgba(34,197,212,0.18))',
            border: '1px solid var(--border)',
          }}
        >
          <div className="flex flex-col">
            <strong style={{ color: 'var(--text-primary)' }}>Pro only</strong>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Unlock the full archive for $12/mo.
            </span>
          </div>
          <a
            href={upgradeUrl || '/pricing/'}
            className="px-4 py-2 rounded-tile text-[13px] font-semibold"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
          >
            See pricing
          </a>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-[14px] text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          No past puzzles yet.
        </div>
      ) : (
        <ul className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
          {entries.map(entry => (
            <li key={entry.date}>
              <Link
                to={`/archive/${entry.date}`}
                className="flex items-center justify-between gap-3 px-3 py-3 rounded-tile transition-colors"
                style={{
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                }}
              >
                <span className="font-semibold text-[14px]">{entry.title || 'Untitled puzzle'}</span>
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(entry.date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
