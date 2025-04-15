// components/SkeletonTable.tsx
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface SkeletonTableProps {
  columns: number;
  rows?: number;
  rowHeight?: number;
  gap?: number;
}

const SkeletonTable = ({ columns, rows = 5, rowHeight = 20, gap = 16 }: SkeletonTableProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center"
          style={{ gap: `${gap}px` }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} height={rowHeight} width={120} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonTable;
