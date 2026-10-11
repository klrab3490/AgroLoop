import React from "react";
import { Skeleton } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-in fade-in duration-300">
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    </div>
  );
}
