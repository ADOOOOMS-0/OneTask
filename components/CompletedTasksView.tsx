import React, { useState, useMemo } from 'react';
import { CompletedTask } from '../types';
import { TrashIcon } from './icons';

interface CompletedTasksViewProps {
    tasks: CompletedTask[];
    onPermanentlyDelete: (taskId: string) => void;
}

type FilterType = 'day' | 'week' | 'month' | 'all';

const FilterButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isActive
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
    >
        {label}
    </button>
);

const CompletedTasksView: React.FC<CompletedTasksViewProps> = ({ tasks, onPermanentlyDelete }) => {
    const [filter, setFilter] = useState<FilterType>('day');

    const filteredTasks = useMemo(() => {
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        const oneMonth = 30 * oneDay; // Approximation

        const sortedTasks = [...tasks].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

        if (filter === 'all') {
            return sortedTasks;
        }
        
        let timeThreshold: number;
        if (filter === 'day') timeThreshold = oneDay;
        else if (filter === 'week') timeThreshold = oneWeek;
        else timeThreshold = oneMonth;

        return sortedTasks.filter(task => now.getTime() - new Date(task.completedAt).getTime() <= timeThreshold);
    }, [tasks, filter]);

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Completed Tasks</h3>
            
            <div className="flex items-center gap-2 mb-6">
                <FilterButton label="Last 24 Hours" isActive={filter === 'day'} onClick={() => setFilter('day')} />
                <FilterButton label="Last 7 Days" isActive={filter === 'week'} onClick={() => setFilter('week')} />
                <FilterButton label="Last 30 Days" isActive={filter === 'month'} onClick={() => setFilter('month')} />
                <FilterButton label="All Time" isActive={filter === 'all'} onClick={() => setFilter('all')} />
            </div>

            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => (
                        <div key={task.id} className="bg-slate-100 dark:bg-slate-700/50 p-3 rounded-md flex items-center justify-between">
                            <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{task.title}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {task.projectName} • Completed on {new Date(task.completedAt).toLocaleDateString()}
                                </p>
                            </div>
                            <button 
                                onClick={() => onPermanentlyDelete(task.id)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                aria-label={`Permanently delete task: ${task.title}`}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 pt-8">
                        No completed tasks in this period.
                    </p>
                )}
            </div>
        </div>
    );
};

export default CompletedTasksView;