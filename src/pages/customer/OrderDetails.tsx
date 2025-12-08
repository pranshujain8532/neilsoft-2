import { motion } from 'framer-motion';

const OrderDetails = () => {
    return (
        <div className="max-w-4xl mx-auto section-padding">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-8">Order Details</h1>
                <div className="card-glass p-12 text-center">
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        Detailed order view with plant assignment, delivery tracking, and blockchain certificate download.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default OrderDetails;
