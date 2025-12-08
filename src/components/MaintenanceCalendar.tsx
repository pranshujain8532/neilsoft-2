import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

interface MaintenanceEvent {
    vehicleId: string;
    dueDate: string;
    description: string;
    status?: 'pending' | 'completed' | 'overdue';
}

const MaintenanceCalendar: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [events, setEvents] = useState<MaintenanceEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSchedule();
    }, [currentMonth]);

    const fetchSchedule = async () => {
        try {
            // Fetch from ML service maintenance calendar endpoint
            const response = await fetch('http://localhost:5001/maintenance/calendar');
            const data = await response.json();
            if (data.schedule) {
                setEvents(data.schedule);
            }
        } catch (error) {
            console.error('Failed to fetch maintenance schedule', error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const dayDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const getEventsForDay = (date: Date) => {
        return events.filter(event => isSameDay(new Date(event.dueDate), date));
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Wrench className="w-6 h-6 text-blue-500" />
                    Maintenance Schedule
                </h2>
                <div className="flex items-center gap-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-200 min-w-[150px] text-center">
                        {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                    <div key={dayName} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                        {dayName}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {dayDays.map((dayItem, idx) => {
                    const dayEvents = getEventsForDay(dayItem);
                    const isCurrentMonth = isSameMonth(dayItem, monthStart);

                    return (
                        <div
                            key={dayItem.toString()}
                            className={`min-h-[100px] bg-white dark:bg-gray-800 p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-750
                                ${!isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 text-gray-400' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-medium ${isSameDay(dayItem, new Date()) ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {format(dayItem, dateFormat)}
                                </span>
                                {dayEvents.length > 0 && (
                                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                                        {dayEvents.length}
                                    </span>
                                )}
                            </div>

                            <div className="mt-2 space-y-1">
                                {dayEvents.map((event, i) => (
                                    <div key={i} className="text-xs p-1.5 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 group relative cursor-pointer">
                                        <div className="font-medium text-blue-700 dark:text-blue-300 truncate">
                                            {event.vehicleId}
                                        </div>
                                        <div className="text-blue-600 dark:text-blue-400 truncate text-[10px]">
                                            {event.description}
                                        </div>

                                        {/* Tooltip */}
                                        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                            <p className="font-bold">{event.vehicleId}</p>
                                            <p>{event.description}</p>
                                            <p className="text-gray-400 mt-1">Due: {format(new Date(event.dueDate), 'MMM d, yyyy')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Scheduled Maintenance</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Urgent / Overdue</span>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceCalendar;
