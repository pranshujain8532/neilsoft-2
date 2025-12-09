import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    AlertCircle,
    Info,
    X,
    Bell,
    CheckCircle2,
    Volume2
} from 'lucide-react';

interface Alert {
    id: string;
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO';
    title: string;
    message: string;
    plant_name: string;
    value: number | null;
    threshold: number | null;
    triggered_at: string;
    acknowledged: boolean;
}

const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5001';

// Audio notification for critical alerts
const playAlertSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;

        oscillator.start();
        setTimeout(() => {
            oscillator.frequency.value = 600;
        }, 150);
        setTimeout(() => {
            oscillator.stop();
        }, 300);
    } catch (e) {
        console.log('Audio not available');
    }
};

const severityConfig = {
    CRITICAL: {
        icon: AlertTriangle,
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500',
        textColor: 'text-red-400',
        badgeColor: 'bg-red-500',
    },
    HIGH: {
        icon: AlertCircle,
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500',
        textColor: 'text-orange-400',
        badgeColor: 'bg-orange-500',
    },
    WARNING: {
        icon: Info,
        bgColor: 'bg-yellow-500/20',
        borderColor: 'border-yellow-500',
        textColor: 'text-yellow-400',
        badgeColor: 'bg-yellow-500',
    },
    INFO: {
        icon: Info,
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500',
        textColor: 'text-blue-400',
        badgeColor: 'bg-blue-500',
    },
};

const AlertPopup = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Fetch active alerts
    const fetchAlerts = useCallback(async () => {
        try {
            const response = await fetch(`${ML_API_URL}/api/alerts/active`);
            const data = await response.json();

            if (data.success && data.alerts) {
                // Filter out dismissed alerts
                const newAlerts = data.alerts.filter(
                    (alert: Alert) => !dismissedIds.has(alert.id)
                );

                // Check for new critical/high alerts
                const existingIds = new Set(alerts.map(a => a.id));
                const brandNewAlerts = newAlerts.filter(
                    (a: Alert) => !existingIds.has(a.id) && !dismissedIds.has(a.id)
                );

                // Play sound for new critical/high alerts
                if (soundEnabled && brandNewAlerts.some((a: Alert) =>
                    a.severity === 'CRITICAL' || a.severity === 'HIGH'
                )) {
                    playAlertSound();
                }

                setAlerts(newAlerts);
            }
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        }
    }, [dismissedIds, alerts, soundEnabled]);

    // Poll for alerts every 5 seconds
    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 5000);
        return () => clearInterval(interval);
    }, [fetchAlerts]);

    // Dismiss an alert
    const dismissAlert = async (alertId: string) => {
        setDismissedIds(prev => new Set([...prev, alertId]));

        try {
            await fetch(`${ML_API_URL}/api/alerts/acknowledge/${alertId}`, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
        }
    };

    // Only show CRITICAL and HIGH alerts as popups
    const popupAlerts = alerts.filter(
        a => (a.severity === 'CRITICAL' || a.severity === 'HIGH') && !a.acknowledged
    ).slice(0, 3); // Max 3 popups

    if (popupAlerts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md">
            {/* Sound toggle */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`self-end p-2 rounded-full ${soundEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                    }`}
                title={soundEnabled ? 'Mute alerts' : 'Unmute alerts'}
            >
                <Volume2 className="w-4 h-4" />
            </motion.button>

            <AnimatePresence>
                {popupAlerts.map((alert) => {
                    const config = severityConfig[alert.severity];
                    const Icon = config.icon;

                    return (
                        <motion.div
                            key={alert.id}
                            initial={{ opacity: 0, x: 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className={`
                relative overflow-hidden rounded-xl border-l-4
                ${config.borderColor} ${config.bgColor}
                backdrop-blur-xl shadow-2xl
              `}
                        >
                            {/* Animated pulse for critical */}
                            {alert.severity === 'CRITICAL' && (
                                <motion.div
                                    className="absolute inset-0 bg-red-500/10"
                                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                />
                            )}

                            <div className="relative p-4">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${config.badgeColor}`}>
                                            <Icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${config.badgeColor} text-white`}>
                                                    {alert.severity}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(alert.triggered_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-white mt-1">{alert.title}</h3>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => dismissAlert(alert.id)}
                                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="mt-3 pl-12">
                                    <p className="text-sm text-gray-300">{alert.message}</p>

                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                        <span>Plant: {alert.plant_name}</span>
                                        {alert.value !== null && (
                                            <span className={config.textColor}>
                                                Value: {alert.value}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-3 pl-12">
                                    <button
                                        onClick={() => dismissAlert(alert.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 
                             rounded-lg text-xs font-medium text-white transition-colors"
                                    >
                                        <CheckCircle2 className="w-3 h-3" />
                                        Acknowledge
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Alert count badge */}
            {alerts.length > 3 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="self-end flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 
                     backdrop-blur rounded-full text-xs text-gray-300"
                >
                    <Bell className="w-3 h-3" />
                    +{alerts.length - 3} more alerts
                </motion.div>
            )}
        </div>
    );
};

export default AlertPopup;
