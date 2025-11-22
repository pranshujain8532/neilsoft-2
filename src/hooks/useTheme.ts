import { useEffect, useState } from 'react';

export const useTheme = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Auto dark mode based on time of day
        const checkTime = () => {
            const hour = new Date().getHours();
            // Dark mode from 6 PM (18) to 6 AM (6)
            const shouldBeDark = hour >= 18 || hour < 6;

            setIsDark(shouldBeDark);

            if (shouldBeDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        // Check immediately
        checkTime();

        // Check every minute
        const interval = setInterval(checkTime, 60000);

        return () => clearInterval(interval);
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);

        if (newIsDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return { isDark, toggleTheme };
};
