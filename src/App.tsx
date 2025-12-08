import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './hooks/useTheme';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import OrderManagement from './pages/admin/OrderManagement';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import PlantMonitoring from './pages/admin/PlantMonitoring';
import Analytics from './pages/admin/Analytics';
import LaborManagement from './pages/admin/LaborManagement';
import EnergyMix from './pages/admin/EnergyMix';
import Plants from './pages/admin/Plants';
// Removed: import AdminMetrics from './pages/AdminMetrics';

// Transport
import Transport from './pages/Transport';
import Maintenance from './pages/Maintenance';

// Storage
import Storage from './pages/Storage';

// Customer Pages
import Shop from './pages/customer/Shop';
import Cart from './pages/customer/Cart';
import OrderDetails from './pages/customer/OrderDetails';
import OrderHistory from './pages/customer/OrderHistory';

// Layout
import Navbar from './components/layout/Navbar';

function App() {
    useTheme();

    return (
        <Router>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
                <Routes>
                    {/* Public Routes - No Login Required */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Admin Routes - Login Required + Admin Role */}
                    <Route path="/admin/*" element={
                        <ProtectedRoute requireAdmin>
                            <>
                                <Navbar />
                                <Routes>
                                    <Route path="dashboard" element={<AdminDashboard />} />
                                    <Route path="plant-monitoring" element={<PlantMonitoring />} />
                                    <Route path="plants" element={<Plants />} />
                                    <Route path="orders" element={<OrderManagement />} />
                                    <Route path="analytics" element={<Analytics />} />
                                    <Route path="labor" element={<LaborManagement />} />
                                    <Route path="energy-mix" element={<EnergyMix />} />

                                </Routes>
                            </>
                        </ProtectedRoute>
                    } />

                    {/* Transport Routes - Login Required */}
                    <Route path="/transport" element={
                        <ProtectedRoute>
                            <>
                                <Navbar />
                                <Transport />
                            </>
                        </ProtectedRoute>
                    } />
                    <Route path="/maintenance" element={
                        <ProtectedRoute>
                            <>
                                <Navbar />
                                <Maintenance />
                            </>
                        </ProtectedRoute>
                    } />

                    {/* Storage Routes - Login Required */}
                    <Route path="/storage" element={
                        <ProtectedRoute>
                            <>
                                <Navbar />
                                <Storage />
                            </>
                        </ProtectedRoute>
                    } />

                    {/* Customer Routes - Login Required */}
                    <Route path="/shop" element={
                        <ProtectedRoute>
                            <>
                                <Navbar />
                                <Shop />
                            </>
                        </ProtectedRoute>
                    } />
                    <Route path="/cart" element={
                        <ProtectedRoute>
                            <>
                                <Navbar />
                                <Cart />
                            </>
                        </ProtectedRoute>
                    } />
                    <Route path="/order/:id" element={
                        <ProtectedRoute>
                            <>
                                <Navbar />
                                <OrderDetails />
                            </>
                        </ProtectedRoute>
                    } />
                    <Route path="/orders" element={
                        <ProtectedRoute>
                            <>
                                <Navbar />
                                <OrderHistory />
                            </>
                        </ProtectedRoute>
                    } />

                    {/* Catch all - Redirect to Landing */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
