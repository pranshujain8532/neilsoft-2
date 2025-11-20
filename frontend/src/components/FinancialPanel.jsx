import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

const FinancialPanel = () => {
    const [lcohData, setLcohData] = useState(null);

    useEffect(() => {
        fetchLcohData();
    }, []);

    const fetchLcohData = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/economics/lcoh');
            const data = await response.json();
            setLcohData(data);
        } catch (error) {
            console.error('Failed to fetch LCOH data:', error);
        }
    };

    if (!lcohData) {
        return <div className="glass-card p-6 rounded-2xl h-64 flex items-center justify-center">
            <div className="text-slate-400">Loading financial data...</div>
        </div>;
    }

    const lcoh = lcohData.lcoh_usd_per_kg;
    const isCompetitive = lcoh < 2.0;

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Economics</h2>
                        <p className="text-xs text-slate-400">Cost analysis & profitability</p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <div className="text-sm text-slate-400 mb-2">Levelized Cost of Hydrogen (LCOH)</div>
                <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-white">${lcoh.toFixed(2)}</span>
                    <span className="text-lg text-slate-500">/{lcohData.currency} per kg</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    {isCompetitive ? (
                        <>
                            <TrendingDown className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-green-400">Below target threshold ($2/kg)</span>
                        </>
                    ) : (
                        <>
                            <TrendingUp className="w-4 h-4 text-yellow-400" />
                            <span className="text-sm text-yellow-400">Above target threshold</span>
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/50">
                <CostBreakdownItem
                    label="Annual CAPEX"
                    value={`$${(lcohData.breakdown.capex / 1000).toFixed(0)}K`}
                    percentage={40}
                />
                <CostBreakdownItem
                    label="Annual OPEX"
                    value={`$${(lcohData.breakdown.opex / 1000).toFixed(0)}K`}
                    percentage={23}
                />
                <CostBreakdownItem
                    label="Energy Costs"
                    value="$120K"
                    percentage={18}
                />
                <CostBreakdownItem
                    label="Maintenance"
                    value="$45K"
                    percentage={7}
                />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/50">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Annual Production</span>
                    <span className="text-sm font-semibold text-white">
                        {(lcohData.breakdown.production / 1000).toFixed(0)}K kg
                    </span>
                </div>
            </div>
        </div>
    );
};

const CostBreakdownItem = ({ label, value, percentage }) => (
    <div>
        <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm text-slate-400">{label}</span>
            <span className="text-sm font-semibold text-white">{value}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                style={{ width: `${percentage}%` }}
            />
        </div>
    </div>
);

export default FinancialPanel;
