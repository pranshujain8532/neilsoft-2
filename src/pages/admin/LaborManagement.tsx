import { motion } from 'framer-motion';

const LaborManagement = () => {
    return (
        <div className="max-w-7xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-8">Labor Management</h1>
                <div className="card-glass p-12 text-center">
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        Track workforce attendance, shift scheduling, and performance metrics across all plants.
                    </p>
                    <p className="mt-4 text-sm text-gray-500">
                        Full implementation includes attendance tracking, shift rosters, performance KPIs, and safety training records.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LaborManagement;
