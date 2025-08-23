import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  children: React.ReactNode;
  field: string;
  currentSort: {
    field: string;
    direction: SortDirection;
  } | null;
  onSort: (field: string) => void;
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  children,
  field,
  currentSort,
  onSort,
  className = ""
}) => {
  const isActive = currentSort?.field === field;
  const direction = currentSort?.direction;

  const handleClick = () => {
    onSort(field);
  };

  return (
    <th
      className={`px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100/50 transition-colors ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`h-3 w-3 -mb-1 transition-colors ${
              isActive && direction === 'asc' ? 'text-blue-600' : 'text-slate-400'
            }`}
          />
          <ChevronDown
            className={`h-3 w-3 transition-colors ${
              isActive && direction === 'desc' ? 'text-blue-600' : 'text-slate-400'
            }`}
          />
        </div>
      </div>
    </th>
  );
};