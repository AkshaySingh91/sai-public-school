
export const InputField = ({ icon, label, textarea = false, ...props }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center">
            <span className="mr-2 text-purple-500">{icon}</span>
            {label}
        </label>
        {textarea ? (
            <textarea
                {...props}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                rows="3"
            />
        ) : (
            <input
                {...props}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
        )}
    </div>
);
