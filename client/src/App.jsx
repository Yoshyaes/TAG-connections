import { Routes, Route } from 'react-router-dom';
import PuzzleGrid from './components/PuzzleGrid';
import AdminPanel from './components/AdminPanel';

export default function App() {
  // WP admin page injects data-mode="admin" on the root div
  const rootEl = document.getElementById('tag-connections-root');
  const wpMode = rootEl?.getAttribute('data-mode');

  // If rendered inside WP admin page, show admin panel directly
  if (wpMode === 'admin') {
    return <AdminPanel />;
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <Routes>
        <Route
          path="/"
          element={
            <div className="w-full max-w-game mx-auto px-4 py-6 flex flex-col items-center">
              <PuzzleGrid />
            </div>
          }
        />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </div>
  );
}
