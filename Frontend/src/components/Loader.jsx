import { motion } from "framer-motion";
import loader from "../assets/loader.gif"

const LoadingScreen = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center space-y-8">
            <div
                className="relative"
            >
                <img src={loader} alt="loader"
                    className="lg:h-32 lg:w-50 sm:h-28 sm:w-40"
                />
            </div>

            {/* School Name Animation */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="text-center space-y-2"
            >
                <h1 className="text-4xl font-bold text-blue-900 flex items-center justify-center">
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        S
                    </motion.span>
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        A
                    </motion.span>
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        I
                    </motion.span>
                </h1>
                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xl text-indigo-600 font-semibold"
                >
                    Public School
                </motion.p>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-md text-gray-500 mt-4"
                >
                    Shaping Minds, Building Futures
                </motion.p>
            </motion.div>

            {/* Progress Dots */}
            <div className="flex space-x-2">
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="w-3 h-3 bg-blue-400 rounded-full"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default LoadingScreen