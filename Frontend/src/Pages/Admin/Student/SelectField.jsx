export const SelectField = ({ icon, label, value, onChange, options, required = false, className = false }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700 flex items-center">
      {icon && <span className="mr-2 text-purple-500">{icon}</span>}
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`${!className ? "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none transition-all" : className}`}
        required={required}
      >
        <option value="">Select {label}</option>
        {options.map((option) =>
          typeof option === 'object' ? (
            // If the option is an object, we can display the label and use the id as the value
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ) : (
            // If it's just a string, display the string as both value and label
            <option key={option} value={option}>
              {option}
            </option>
          )
        )}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);
