import React, { useState, useEffect } from 'react';
import { ALL_SCENARIOS } from '../scenarios';

interface StartScreenProps {
  onStart: (scenarioId: string) => void;
  onSpectate: (scenarioId: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onSpectate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const selectedScenario = ALL_SCENARIOS[selectedScenarioIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-sans relative overflow-y-auto overflow-x-hidden p-4 md:p-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none fixed">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none fixed" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      <div className={`text-center p-8 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 max-w-4xl w-full mx-auto relative z-10 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-purple-500 rounded-br-3xl opacity-50 pointer-events-none"></div>

        {/* Icon/Logo */}
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <div className="text-6xl md:text-8xl animate-bounce-slow">🏛️</div>
            <div className="absolute -top-2 -right-2 text-2xl md:text-3xl animate-spin-slow">⚡</div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient-text">
          Political World
        </h1>
        <div className="h-1 w-32 md:w-48 mx-auto mb-6 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full"></div>
        
        {/* Scenarios Section */}
        <div className="mb-8 text-left">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-200 border-b border-gray-700 pb-2">Select Scenario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_SCENARIOS.map((scenario, index) => (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenarioIndex(index)}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-start text-left h-full ${
                  selectedScenarioIndex === index 
                    ? 'border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20' 
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="flex justify-between w-full items-center mb-1">
                  <h3 className={`font-bold text-lg ${selectedScenarioIndex === index ? 'text-blue-300' : 'text-gray-300'}`}>
                    {scenario.title}
                  </h3>
                  <span className="text-xs font-mono px-2 py-1 bg-gray-900 rounded text-gray-400">
                    {new Date(scenario.date).getFullYear()}
                  </span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mt-2 line-clamp-3">
                  {scenario.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center mt-6">
            <button
              onClick={() => onStart(selectedScenario.id)}
              className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl text-lg transition-all shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 border-2 border-blue-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
              <span className="relative flex items-center justify-center gap-2">
                <span className="text-xl">🎮</span>
                Start {new Date(selectedScenario.date).getFullYear()}
              </span>
            </button>
            
            <button
              onClick={() => onSpectate(selectedScenario.id)}
              className="group relative px-8 py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-xl text-lg transition-all shadow-lg hover:shadow-2xl hover:shadow-teal-500/50 hover:scale-105 border-2 border-teal-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
              <span className="relative flex items-center justify-center gap-2">
                <span className="text-xl">👁️</span>
                Spectate History
              </span>
            </button>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 pt-6 border-t border-gray-700/50 hidden sm:block">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <span className="text-xl">🗳️</span>
              <span>Dynamic Elections</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <span className="text-xl">🤝</span>
              <span>Coalition Building</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <span className="text-xl">📊</span>
              <span>Real-Time Strategy</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .animate-pulse-slow { align-self: center; animation: pulse-slow 8s ease-in-out infinite; }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 10s linear infinite; }
        @keyframes gradient-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-text { background-size: 200% auto; animation: gradient-text 5s ease-in-out infinite; }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default StartScreen;