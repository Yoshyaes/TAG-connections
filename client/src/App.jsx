import { Routes, Route } from 'react-router-dom';
import PuzzleGrid from './components/PuzzleGrid';
import AdminPanel from './components/AdminPanel';
import Archive from './components/Archive';
import ArchivePlay from './components/ArchivePlay';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  // WP admin page injects data-mode="admin" on the root div
  const rootEl = document.getElementById('tag-connections-root');
  const wpMode = rootEl?.getAttribute('data-mode');

  // If rendered inside WP admin page, show admin panel directly
  if (wpMode === 'admin') {
    return <AdminPanel />;
  }

  return (
    // C3: min-h-screen forced the embedded SPA to the full viewport height,
    // leaving a large blank block below the board on desktop (it's one
    // panel on a WP page, not a standalone app). A content-driven height
    // with a small floor instead.
    <div className="w-full flex flex-col items-center" style={{ minHeight: '600px' }}>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            <div className="w-full max-w-game mx-auto px-4 py-6 flex flex-col items-center">
              <PuzzleGrid />
            </div>
          }
        />
        <Route path="/archive" element={<Archive />} />
        <Route path="/archive/:date" element={<ArchivePlay />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </div>
  );
}
