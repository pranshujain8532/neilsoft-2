import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
    const location = useLocation();

    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user) {
        // Not logged in, redirect to login with return URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check admin role if required
    if (requireAdmin && user.role !== 'admin') {
        // Not admin, redirect to customer shop
        return <Navigate to="/shop" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
