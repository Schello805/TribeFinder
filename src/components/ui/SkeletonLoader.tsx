export function GroupCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-6 skeleton rounded w-3/4" />
        <div className="h-4 skeleton rounded w-full" />
        <div className="h-4 skeleton rounded w-5/6" />
        <div className="flex gap-2 mt-4">
          <div className="h-6 skeleton rounded-full w-16" />
          <div className="h-6 skeleton rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1 space-y-2">
          <div className="h-6 skeleton rounded w-2/3" />
          <div className="h-4 skeleton rounded w-1/2" />
        </div>
        <div className="h-10 w-10 skeleton rounded-full" />
      </div>
      <div className="h-4 skeleton rounded w-full" />
      <div className="h-4 skeleton rounded w-4/5" />
    </div>
  );
}

export function ListSkeleton({ count = 3, type = "group" }: { count?: number; type?: "group" | "event" }) {
  const Skeleton = type === "group" ? GroupCardSkeleton : EventCardSkeleton;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  );
}
