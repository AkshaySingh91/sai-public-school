export default function TableLoader({ headers = 5, rows = 5 }) {
    return (
        <div className="animate-pulse overflow-hidden rounded-xl border border-purple-100/30 bg-gradient-to-br from-gray-50 to-purple-50 shadow-purple-sm">
            {/* Table Header Loader */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 border-b border-purple-100/30 bg-purple-50/30 backdrop-blur-sm px-4 py-4 sm:px-6">
                {[...Array(headers)].map((_, i) => (
                    <div key={i} className="h-5 rounded-lg bg-purple-200/40 relative overflow-hidden">
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-purple-50/40 to-transparent animate-shimmer" />
                    </div>
                ))}
            </div>

            {/* Table Body Loader */}
            <div className="divide-y divide-purple-100/20">
                {[...Array(rows)].map((_, rowIndex) => (
                    <div
                        key={rowIndex}
                        className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 px-4 py-3 sm:px-6 hover:bg-purple-50/20 transition-colors"
                    >
                        {[...Array(headers)].map((_, colIndex) => (
                            <div key={colIndex} className="space-y-2 py-2">
                                {/* Main Content Shimmer */}
                                <div className="h-4 rounded-md bg-purple-100/50 relative overflow-hidden">
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-purple-100/30 via-white to-purple-100/30 animate-shimmer" />
                                </div>

                                {/* Subtext Shimmer */}
                                {colIndex === 0 && (
                                    <div className="h-3 w-3/4 rounded-md bg-purple-100/30 relative overflow-hidden">
                                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-purple-100/20 via-white to-purple-100/20 animate-shimmer" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Table Footer Loader */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-purple-100/30 bg-purple-50/30 backdrop-blur-sm px-4 py-4 sm:px-6">
                <div className="h-4 w-32 rounded-lg bg-purple-200/40 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-purple-50/40 to-transparent animate-shimmer" />
                </div>
                <div className="flex gap-2">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-8 w-8 rounded-lg bg-purple-200 hover:bg-purple-300/40 transition-colors relative overflow-hidden"
                        >
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-purple-50/40 to-transparent animate-shimmer" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Animation Keyframes */}
            <style jsx>{`
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
          .animate-shimmer {
            animation: shimmer 2s infinite;
          }
          .shadow-purple-sm {
            box-shadow: 0 1px 12px -1px rgba(125, 60, 152, 0.05);
          }
        `}</style>
        </div>
    );
}