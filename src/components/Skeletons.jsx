/* Shimmer loading skeletons for each page */

function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function EmployeeRiskSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Hero banner skeleton */}
      <div className="bg-gradient-to-r from-gray-300 to-gray-200 px-6 py-8">
        <Pulse className="h-7 w-80 mb-2 !bg-gray-100/40" />
        <Pulse className="h-4 w-60 !bg-gray-100/30" />
        <Pulse className="h-10 w-64 mt-4 !bg-white/50 rounded" />
        <div className="flex gap-4 mt-4">
          <Pulse className="h-16 w-40 !bg-green-300/40 rounded-lg" />
          <Pulse className="h-16 w-40 !bg-green-300/40 rounded-lg" />
        </div>
      </div>
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <Pulse className="h-6 w-72 mb-4" />
          <div className="flex gap-6">
            <div className="flex-1 space-y-3">
              <Pulse className="h-4 w-48 mx-auto" />
              <Pulse className="h-64 w-full rounded-lg" />
            </div>
            <div className="w-72 space-y-4">
              <Pulse className="h-32 w-full rounded-lg !bg-blue-200" />
              <Pulse className="h-20 w-full rounded-lg !bg-red-200" />
              <Pulse className="h-20 w-full rounded-lg !bg-gray-300" />
              <Pulse className="h-20 w-full rounded-lg !bg-green-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DepartmentSkeleton() {
  return (
    <div className="p-6 animate-fade-in">
      <Pulse className="h-7 w-56 mb-1" />
      <Pulse className="h-4 w-80 mb-6" />
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Pulse key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Pulse className="h-64 w-full rounded-lg mb-4" />
      {/* Department cards */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Pulse key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="p-6 animate-fade-in">
      <Pulse className="h-7 w-56 mb-4" />
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <Pulse className="h-8 w-48 rounded" />
        <Pulse className="h-8 w-48 rounded" />
        <Pulse className="h-8 w-48 rounded" />
      </div>
      {/* Chart cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <Pulse className="h-4 w-32 mb-3" />
            <Pulse className="h-44 w-full rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <Pulse className="h-4 w-32 mb-3" />
            <Pulse className="h-48 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WhatIfSkeleton() {
  return (
    <div className="p-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <Pulse className="h-8 w-36 rounded" />
        <Pulse className="h-8 w-44 rounded" />
      </div>
      {/* Controls + Stats */}
      <div className="flex items-center justify-between mb-4">
        <Pulse className="h-10 w-64 rounded" />
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <Pulse key={i} className="h-16 w-28 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Scatter + List */}
      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
          <Pulse className="h-4 w-72 mb-3" />
          <Pulse className="h-80 w-full rounded" />
        </div>
        <div className="w-80 bg-white rounded-lg border border-gray-200 p-4">
          <Pulse className="h-4 w-40 mb-3" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Pulse className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Pulse className="h-3 w-32 mb-1" />
                  <Pulse className="h-2 w-24" />
                </div>
                <Pulse className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
