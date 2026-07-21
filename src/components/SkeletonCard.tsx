import React from "react";

interface SkeletonCardProps {
  id?: string;
  key?: React.Key;
}

export default function SkeletonCard({ id }: SkeletonCardProps) {
  return (
    <div 
      id={id}
      className="bg-slate-200/50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-800/30 p-6 rounded-2xl flex flex-col items-center text-center h-36 animate-pulse justify-center"
    >
      {/* Icon circle placeholder */}
      <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 mb-4"></div>
      
      {/* Label line placeholder */}
      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
      
      {/* Value line placeholder */}
      <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
    </div>
  );
}
