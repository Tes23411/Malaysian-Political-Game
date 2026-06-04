import React from 'react';
import { Bill } from '../types';

interface ActiveLawsPanelProps {
    passedLaws: Bill[];
    onClose: () => void;
}

const ActiveLawsPanel: React.FC<ActiveLawsPanelProps> = ({ passedLaws, onClose }) => {
    return (
        <div className="bg-gray-800 text-white rounded-lg shadow-2xl flex flex-col h-full border border-gray-700 w-96 animate-fade-in relative z-[100]">
            <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">📜</span> Statutes & Laws
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {passedLaws.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-900/30 rounded-lg">
                        <span className="text-4xl mb-4 opacity-50">⚖️</span>
                        <h4 className="text-xl font-bold text-gray-400 mb-2">No Acts Passed</h4>
                        <p className="text-gray-500 text-sm">
                            Parliament has not yet passed any significant legislation.
                        </p>
                    </div>
                ) : (
                    passedLaws.map((law, idx) => (
                        <div key={`${law.id}-${idx}`} className="bg-gray-900/80 p-4 border border-gray-700 rounded-lg relative overflow-hidden">
                            {law.isConstitutional && (
                                <div className="absolute top-0 right-0 bg-red-900/50 text-red-200 text-[10px] uppercase font-bold px-2 py-1 border-b border-l border-red-800">
                                    Constitutional
                                </div>
                            )}
                            <h3 className="font-bold text-lg text-amber-400 mb-2">{law.title}</h3>
                            <p className="text-sm text-gray-300 mb-3">{law.description}</p>
                            <div className="flex flex-wrap gap-1">
                                {law.tags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-gray-800 border border-gray-600 px-2 py-0.5 rounded capitalize text-gray-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ActiveLawsPanel;
