import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Home, LayoutDashboard, Factory, TruckIcon, Container, ShoppingCart, LogOut, Sun, Moon, Package } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin';

    return (
        <nav className="sticky top-0 z-50 glass border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        {/* Logo */}
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-hydrogen-500 to-green-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-xl">H₂</span>
                            </div>
                            <span className="hidden sm:block text-xl font-bold gradient-text">
                                Green Hydrogen
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex ml-10 space-x-8">
                            <Link to="/" className="navbar-link flex items-center space-x-1">
                                <Home size={18} />
                                <span>Home</span>
                            </Link>

                            {isAdmin && (
                                <>
                                    <Link to="/admin/dashboard" className="navbar-link flex items-center space-x-1">
                                        <LayoutDashboard size={18} />
                                        <span>Dashboard</span>
                                    </Link>
                                    <Link to="/admin/plants" className="navbar-link flex items-center space-x-1">
                                        <Factory size={18} />
                                        <span>Plants</span>
                                    </Link>
                                    <Link to="/transport" className="navbar-link flex items-center space-x-1">
                                        <TruckIcon size={18} />
                                        <span>Transport</span>
                                    </Link>
                                    <Link to="/maintenance" className="navbar-link flex items-center space-x-1">
                                        <TruckIcon size={18} />
                                        <span>Maintenance</span>
                                    </Link>
                                    <Link to="/admin/metrics" className="navbar-link flex items-center space-x-1">
                                        <LayoutDashboard size={18} />
                                        <span>Metrics</span>
                                    </Link>
                                    <Link to="/admin/orders" className="navbar-link flex items-center space-x-1">
                                        <Package size={18} />
                                        <span>Orders</span>
                                    </Link>
                                    <Link to="/storage" className="navbar-link flex items-center space-x-1">
                                        <Container size={18} />
                                        <span>Storage</span>
                                    </Link>
                                </>
                            )}

                            {!isAdmin && user.email && (
                                <>
                                    <Link to="/shop" className="navbar-link flex items-center space-x-1">
                                        <ShoppingCart size={18} />
                                        <span>Shop</span>
                                    </Link>
                                    <Link to="/orders" className="navbar-link flex items-center space-x-1">
                                        <LayoutDashboard size={18} />
                                        <span>My Orders</span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center space-x-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* User Menu */}
                        {user.email ? (
                            <div className="hidden md:flex items-center space-x-4">
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    {user.name || user.email}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center space-x-1 navbar-link"
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        ) : (
                            <div className="hidden md:flex space-x-4">
                                <Link to="/login" className="btn-primary">
                                    Login
                                </Link>
                                <Link to="/signup" className="btn-secondary">
                                    Sign Up
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden glass border-t border-white/10">
                    <div className="px-4 pt-2 pb-4 space-y-2">
                        <Link
                            to="/"
                            className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            Home
                        </Link>

                        {isAdmin && (
                            <>
                                <Link
                                    to="/admin/dashboard"
                                    className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/admin/plants"
                                    className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Plants
                                </Link>
                                <Link
                                    to="/transport"
                                    className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Transport
                                </Link>
                                <Link
                                    to="/storage"
                                    className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Storage
                                </Link>
                            </>
                        )}

                        {!isAdmin && user.email && (
                            <>
                                <Link
                                    to="/shop"
                                    className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Shop
                                </Link>
                                <Link
                                    to="/orders"
                                    className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    My Orders
                                </Link>
                            </>
                        )}

                        {user.email ? (
                            <button
                                onClick={() => {
                                    handleLogout();
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                Logout
                            </button>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/signup"
                                    className="block px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
