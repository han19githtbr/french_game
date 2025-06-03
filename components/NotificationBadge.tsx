export default function NotificationBadge({ count }: { count: number }) {
  
  if (count === 0) return null;

  return (
    <div className="relative">
      <span className="text-white">🔔</span>
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
        {count}
      </span>
    </div>
  );
}