function CollegeTableLoader({ rows = 5, cols = 6 }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-sm">
                <thead>
                    <tr>
                        {[...Array(cols)].map((_, idx) => (
                            <th key={idx} className="px-6 py-3">
                                <div className="mx-auto h-4 w-3/4 bg-green-200 rounded animate-pulse" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {[...Array(rows)].map((_, rowIdx) => (
                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-green-50' : 'bg-green-100'}>
                            {[...Array(cols)].map((_, colIdx) => (
                                <td key={colIdx} className="px-6 py-4">
                                    <div className="h-4 bg-green-100 rounded animate-pulse" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
export default CollegeTableLoader;