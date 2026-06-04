import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EconomicSnapshot } from '../types';

interface EconomicHistoryPanelProps {
  history: EconomicSnapshot[];
  onClose: () => void;
}

const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return `${date.toLocaleString('default', { month: 'short' })} '${date.getFullYear().toString().substring(2)}`;
};

const EconomicHistoryPanel: React.FC<EconomicHistoryPanelProps> = ({ history, onClose }) => {
  const chartData = useMemo(() => {
    return history.map(snap => ({
      date: formatDate(snap.date),
      fullDate: snap.date, // keep original for sorting if needed
      GDP: Number(snap.gdpGrowthRate.toFixed(2)),
      Inflation: Number(snap.inflationRate.toFixed(2)),
      Unemployment: Number(snap.unemploymentRate.toFixed(2)),
      Approval: Number(snap.publicApproval.toFixed(1)),
      Debt: Number(snap.nationalDebt.toFixed(0)),
    }));
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl flex flex-col items-center">
            <h2 className="text-xl text-white mb-2">Insufficient Data</h2>
            <p className="text-gray-400 mb-4">The game has not gathered enough economic data to plot history.</p>
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 rounded text-white font-bold hover:bg-blue-500">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold font-serif tracking-tight text-white flex items-center gap-2">
              📊 National Economic History
            </h2>
            <p className="text-gray-400 text-sm">Long-term trending of macroeconomic indicators.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl font-light transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-8">
            
            {/* Core Indicators Chart */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Macroeconomic Growth & Prices (%)</h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                                dataKey="date" 
                                stroke="#9CA3AF" 
                                tick={{ fontSize: 12 }}
                                minTickGap={30}
                            />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF' }}
                                itemStyle={{ fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                            <Line type="monotone" dataKey="GDP" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="GDP Growth (%)" />
                            <Line type="monotone" dataKey="Inflation" stroke="#EF4444" strokeWidth={2} dot={false} name="Inflation (%)" />
                            <Line type="monotone" dataKey="Unemployment" stroke="#F59E0B" strokeWidth={2} dot={false} name="Unemployment (%)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Approval & Debt Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Approval */}
                 <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Public Approval (%)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} minTickGap={30}/>
                                <YAxis stroke="#9CA3AF" domain={[0, 100]} tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF' }} />
                                <Line type="monotone" dataKey="Approval" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* National Debt */}
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">National Debt (Billion MYR)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} minTickGap={30}/>
                                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#FFF' }} formatter={(val) => `MYR ${val}B`} />
                                <Line type="monotone" dataKey="Debt" stroke="#8B5CF6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default EconomicHistoryPanel;
