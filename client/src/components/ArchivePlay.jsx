import { useParams } from 'react-router-dom';
import PuzzleGrid from './PuzzleGrid';

export default function ArchivePlay() {
  const { date } = useParams();
  return (
    <div className="w-full max-w-game mx-auto px-4 py-6 flex flex-col items-center">
      <PuzzleGrid date={date} />
    </div>
  );
}
