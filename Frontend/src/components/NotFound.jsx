// src/components/NotFound.jsx
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-9xl font-bold text-[#be185d]">404</h1>
                    <h2 className="text-3xl font-semibold text-gray-900">Page Not Found</h2>
                    <p className="text-gray-600">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                <div className="flex justify-center space-x-4">
                    <button
                        onClick={() => navigate(-1)}
                        variant="outline"
                        className="px-6 py-3"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-[#be185d] text-white px-6 py-3 hover:bg-[#9f1d4d]"
                    >
                        Return Home
                    </button>
                </div>

                {/* Optional decorative element */}
                <div className="mt-12">
                    <svg
                        className="mx-auto h-24 w-24 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default NotFound;