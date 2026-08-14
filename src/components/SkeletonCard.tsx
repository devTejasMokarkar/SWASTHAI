import React from "react";

interface SkeletonCardProps {
  id?: string;
  key?: React.Key;
}

export default function SkeletonCard({ id }: SkeletonCardProps) {
  return (
    <div 
      id={id}
      className="bg-slate-200/50 border border-slate-200/30 p-6 rounded-2xl flex flex-col items-center text-center h-36 animate-pulse justify-center"
    >
      {/* Icon circle placeholder */}
      <div className="w-12 h-12 rounded-full bg-slate-200 mb-4"></div>
      
      {/* Label line placeholder */}
      <div className="h-3 w-16 bg-slate-200 rounded mb-2"></div>
      
      {/* Value line placeholder */}
      <div className="h-6 w-24 bg-slate-200 rounded-lg"></div>
    </div>
  );
}
