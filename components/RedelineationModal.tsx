import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ArrowRight, ShieldAlert, FileText } from 'lucide-react';
import { RedelineationAction } from '../utils/redelineation';

interface RedelineationModalProps {
  isOpen: boolean;
  onClose: (updatedScore: number) => void;
  mostAffectedState: string;
  actions: RedelineationAction[];
  initialScore: number;
  updatedScore: number;
}

export const RedelineationModal: React.FC<RedelineationModalProps> = ({
  isOpen,
  onClose,
  mostAffectedState,
  actions,
  initialScore,
  updatedScore,
}) => {
  const [currentStep, setCurrentStep] = useState<'preview' | 'objection' | 'final'>('preview');
  const [objectionDays, setObjectionDays] = useState(21); // 3 weeks = 21 days
  const [objectionMessage, setObjectionMessage] = useState('Opposition parties are drafting legal challenges and organizing street rallies...');
  
  // Filter actions for the most affected state
  const stateActions = actions.filter(
    a => a.state.toUpperCase() === mostAffectedState.toUpperCase()
  );

  // Run objection countdown when step is 'objection'
  useEffect(() => {
    if (currentStep !== 'objection') return;

    const interval = setInterval(() => {
      setObjectionDays(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setObjectionMessage('The Federal Court has dismissed all opposition petitions on technical grounds. The redelineation has been officially gazetted.');
          setTimeout(() => {
            setCurrentStep('final');
          }, 2000);
          return 0;
        }
        
        // Dynamic cosmetic updates during the countdown
        if (prev === 15) {
          setObjectionMessage('Bersih coalition organizes a 10,000-strong rally in Kuala Lumpur protesting the boundaries...');
        } else if (prev === 8) {
          setObjectionMessage('Legal battles reach the Court of Appeal. Ruling coalition argues boundaries align with rural parity goals...');
        } else if (prev === 3) {
          setObjectionMessage('Objection window closing. Final judicial appeals are being summarily reviewed...');
        }

        return prev - 1;
      });
    }, 120); // ticks fast so the player isn't stuck waiting too long, but can enjoy the immersion!

    return () => clearInterval(interval);
  }, [currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-md">
      <div className="bg-gradient-to-b from-gray-950 to-gray-900 border border-amber-900/40 rounded-2xl w-full max-w-4xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col font-serif">
        
        {/* Header */}
        <div className="border-b border-amber-900/20 pb-4 mb-4 flex items-center gap-3">
          <div className="p-2.5 bg-amber-550/10 border border-amber-550/30 rounded-lg text-amber-500">
            <ShieldAlert size={24} />
          </div>
          <div>
            <span className="text-[0.65rem] tracking-widest font-mono text-amber-500 uppercase">Election Commission Gazettement</span>
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-100 to-amber-300">Electoral Constituency Redelineation</h2>
          </div>
        </div>

        {/* Dynamic Steps View */}
        <div className="flex-1 overflow-y-auto pr-1">
          {currentStep === 'preview' && (
            <div className="space-y-5">
              <div className="p-4 bg-amber-950/25 border border-amber-900/30 rounded-xl space-y-2">
                <p className="text-amber-100 text-[0.95rem] leading-relaxed">
                  The Election Commission has announced sweeping boundary modifications under the 8-year federal review mandate. Opposition alliances have immediately decried the proposals, accusing the ruling federal coalition of aggressive gerrymandering to insulate marginal seats.
                </p>
                <p className="text-gray-400 text-xs font-mono">
                  State-level modifications are applied where the federal ruling coalition also holds the state government (Federal territories exempt).
                </p>
              </div>

              <div>
                <h3 className="text-sm tracking-wider font-mono text-amber-500 uppercase mb-2">
                  Most Affected State: <span className="text-amber-200 font-bold">{mostAffectedState}</span>
                </h3>
                
                <div className="border border-white/5 bg-black/40 rounded-xl overflow-hidden scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 font-mono text-gray-400 uppercase tracking-wider text-[0.65rem]">
                        <th className="p-3">Constituency Name</th>
                        <th className="p-3 text-center">Strategy</th>
                        <th className="p-3 text-right">Electors Before</th>
                        <th className="p-3 text-right">Electors After</th>
                        <th className="p-3 text-right">Ethnic Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {stateActions.map((action, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                           <td className="p-3 font-semibold text-gray-200">{action.fromCode} {'->'} {action.toCode}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[0.6rem] font-bold tracking-wider ${
                              action.strategy === 'CRACKING' 
                                ? 'bg-red-950/60 text-red-400 border border-red-900/40' 
                                : action.strategy === 'PACKING'
                                ? 'bg-blue-950/60 text-blue-400 border border-blue-900/40'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40'
                            }`}>
                              {action.strategy}
                            </span>
                          </td>
                          <td className="p-3 text-right text-gray-400">{action.votersBeforeFrom.toLocaleString()}</td>
                          <td className="p-3 text-right text-gray-200 font-bold">{action.votersAfterFrom.toLocaleString()}</td>
                          <td className={`p-3 text-right font-mono font-bold ${action.strategy === 'CRACKING' ? 'text-red-400' : action.strategy === 'PACKING' ? 'text-blue-400' : 'text-emerald-400'}`}>
                            -{action.votersMoved.toLocaleString()} ({action.ethnicGroup})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* National Summary Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <span className="text-[0.65rem] font-mono text-gray-400 uppercase">National Shift Count</span>
                  <div className="text-xl font-bold text-gray-200 mt-1">{actions.length} Adjustments</div>
                  <p className="text-gray-400 text-xs mt-0.5 font-sans">Voter demographics redistributed across state boundaries.</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <span className="text-[0.65rem] font-mono text-gray-400 uppercase">Core Demographics Strategy</span>
                  <div className="text-xl font-bold text-gray-200 mt-1">Cracking & Packing</div>
                  <p className="text-gray-400 text-xs mt-0.5 font-sans">Securing margins using rural-urban weight redistributions.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'objection' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-amber-900/30 border-t-amber-500 animate-spin"></div>
                <div className="absolute font-mono text-xl font-bold text-amber-500 select-none">
                  {objectionDays}d
                </div>
              </div>

              <div className="text-center max-w-lg space-y-3">
                <h3 className="text-lg font-bold text-amber-200">Opposition Objection Window Active</h3>
                <p className="text-gray-300 text-sm leading-relaxed font-sans py-2 italic">
                  "{objectionMessage}"
                </p>
                <div className="w-full bg-amber-950/20 border border-amber-900/20 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all duration-150" 
                    style={{ width: `${(objectionDays / 21) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'final' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
                <div className="text-emerald-400 p-1 bg-emerald-950/60 border border-emerald-900/40 rounded">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">Constituencies Officialized</h4>
                  <p className="text-gray-400 text-xs font-sans">The new boundaries have successfully entered force. All future general and state elections will operate on these shifted lines.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center text-center">
                  <span className="text-[0.65rem] font-mono text-gray-400 uppercase">Before Redelineation</span>
                  <div className="text-2xl font-bold text-gray-300 mt-1">{(10.0 - initialScore).toFixed(1)}/10</div>
                  <span className="text-xs font-mono text-gray-500 mt-0.5">({initialScore.toFixed(2)}:1 Ratio)</span>
                </div>
                <div className="p-5 bg-emerald-950/10 border border-emerald-900/30 rounded-xl flex flex-col justify-center text-center">
                  <span className="text-[0.65rem] font-mono text-emerald-400 uppercase">After Redelineation</span>
                  <div className="text-3xl font-bold text-emerald-400 mt-1">{(10.0 - updatedScore).toFixed(1)}/10</div>
                  <span className="text-xs font-mono text-emerald-500 mt-0.5">({updatedScore.toFixed(3)}:1 Ratio)</span>
                </div>
              </div>

              {updatedScore > 5.0 && (
                <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="text-xs font-bold text-red-300">Democratic Outcry Warning</h5>
                    <p className="text-gray-400 text-[0.7rem] leading-relaxed font-sans mt-0.5">
                      Since the national malapportionment ratio exceeds 5.0:1, democratic watchdogs and international press have flagged the country as highly gerrymandered. This triggers a passive approval penalty of **-6%** due to opposition protests.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-amber-900/20 pt-4 mt-4 flex justify-end">
          {currentStep === 'preview' && (
            <button
              onClick={() => setCurrentStep('objection')}
              className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-gray-950 font-sans font-bold rounded-lg shadow-lg hover:from-amber-500 hover:to-amber-400 hover:scale-[1.02] transition-all flex items-center gap-1.5"
            >
              Start 3-Week Objection Window <ArrowRight size={16} />
            </button>
          )}

          {currentStep === 'final' && (
            <button
              onClick={() => onClose(updatedScore)}
              className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-gray-950 font-sans font-bold rounded-lg shadow-lg hover:from-emerald-500 hover:to-emerald-400 hover:scale-[1.02] transition-all"
            >
              Gazette Boundaries & Proceed
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
