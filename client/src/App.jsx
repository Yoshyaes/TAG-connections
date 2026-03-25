import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import PuzzleGrid from './components/PuzzleGrid';
import AdminPanel from './components/AdminPanel';

export default function App() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      <Routes>
        <Route
          path="/"
          element={
            <div className="w-full max-w-game mx-auto px-4 py-6 flex flex-col items-center">
              <Header />
              <PuzzleGrid />
            </div>
          }
        />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </div>
  );
}
