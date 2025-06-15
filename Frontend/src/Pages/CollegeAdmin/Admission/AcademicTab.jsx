import { useInstitution } from "../../../contexts/InstitutionContext";

function AcademicTab({ studentData, handleInputChange }) {
    const { school: college } = useInstitution();
    const courses = college.courses && college.courses.length ? college.courses.map(course => course.name.toLowerCase()) : ["b.ed", "d.ed"];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Academic Information</h3>

            {/* Course Details */}
            <div className="capitalize grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                    <select
                        value={studentData.course}
                        onChange={(e) => handleInputChange('course', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        {
                            courses.map((c) => (
                                <option value={c} className="uppercase">{c}</option>
                            ))
                        }
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medium</label>
                    <input
                        type="text"
                        value={studentData.medium}
                        onChange={(e) => handleInputChange('medium', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Method of B.Ed */}
            {
                studentData.course?.toLowerCase() === "b.ed" && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Method of B.Ed</label>
                        <div className="capitalize grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                value={studentData.methodOfBed[0] || ''}
                                onChange={(e) => {
                                    const newMethods = [...studentData.methodOfBed];
                                    newMethods[0] = e.target.value;
                                    handleInputChange('methodOfBed', newMethods);
                                }}
                                placeholder="Method 1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <input
                                type="text"
                                value={studentData.methodOfBed[1] || ''}
                                onChange={(e) => {
                                    const newMethods = [...studentData.methodOfBed];
                                    newMethods[1] = e.target.value;
                                    handleInputChange('methodOfBed', newMethods);
                                }}
                                placeholder="Method 2"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                )
            }

            {/* School History */}
            <div>
                <h4 className="text-md font-medium text-gray-800 mb-4">Educational History</h4>
                {['10', '12', 'UG', 'PG', 'Graduation', 'Other'].map((level) => {
                    const history = studentData.schoolHistory[0][level];
                    if (!history && level === 'Graduation') return null; // Skip Graduation if not available
                    if (!history && level === 'PG') return null; // Skip PG if not available
                    if (!history && level === 'Other') return null; // Skip Other if not available
                    const label =
                        level === '10'
                            ? '10th Education'
                            : level === '12'
                                ? '12th Education'
                                : level === 'UG'
                                    ? 'Undergraduate'
                                    : level === 'PG'
                                        ? 'Postgraduate'
                                        : level;
                    return (
                        <fieldset
                            key={level}
                            className="border border-gray-200 rounded-lg p-4 mb-4"
                        >
                            <legend className="text-sm font-semibold text-gray-500 px-2">
                                {label}
                            </legend>

                            <div className="capitalize grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                {/* Stream */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Stream
                                    </label>
                                    <input
                                        type="text"
                                        value={history?.stream || ''}
                                        onChange={(e) =>
                                            handleInputChange('schoolHistory', e.target.value, level, 0)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Seat No */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Seat No
                                    </label>
                                    <input
                                        type="text"
                                        value={history?.seatNo || ''}
                                        onChange={(e) =>
                                            handleInputChange('schoolHistory', e.target.value, level, 0)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* University/Board */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        University/Board
                                    </label>
                                    <input
                                        type="text"
                                        value={history?.university || ''}
                                        onChange={(e) =>
                                            handleInputChange('schoolHistory', e.target.value, level, 0)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Month & Year */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Month & Year
                                    </label>
                                    <input
                                        type="text"
                                        value={history?.monthAndYear || ''}
                                        onChange={(e) =>
                                            handleInputChange('schoolHistory', e.target.value, level, 0)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* School/College Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {level === '10' ? 'School' : 'College'} Name
                                    </label>
                                    <input
                                        type="text"
                                        value={history?.schoolName || history?.collegeName || ''}
                                        onChange={(e) =>
                                            handleInputChange('schoolHistory', e.target.value, level, 0)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Percentage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Percentage
                                    </label>
                                    <input
                                        type="text"
                                        value={history?.percentage || ''}
                                        onChange={(e) =>
                                            handleInputChange('schoolHistory', e.target.value, level, 0)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Obtained Marks */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Obtained Marks
                                    </label>
                                    <input
                                        type="text"
                                        value={history?.obtainedMarks || ''}
                                        onChange={(e) =>
                                            handleInputChange('schoolHistory', e.target.value, level, 0)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Total Marks */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Total Marks
                                    </label>
                                    <input
                                        type="text"
                                        value={history?.totalMarks || ''}
                                        onChange={(e) =>
                                            handleInputChange('schoolHistory', e.target.value, level, 0)
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </fieldset>
                    );
                })}
            </div>
        </div>
    )
}

export default AcademicTab
