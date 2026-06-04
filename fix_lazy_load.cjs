const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/import EconomicPanel from '\.\/components\/EconomicPanel';\n/g, "");
code = code.replace(/import ElectionHistoryScreen from '\.\/screens\/ElectionHistoryScreen';\n/g, "");
code = code.replace(/import \{ PartyNetworkGraphScreen \} from '\.\/components\/PartyNetworkGraphScreen';\n/g, "");

// Add React.lazy imports after the standard imports
const lazyImports = `
const EconomicPanel = React.lazy(() => import('./components/EconomicPanel'));
const ElectionHistoryScreen = React.lazy(() => import('./screens/ElectionHistoryScreen'));
const PartyNetworkGraphScreen = React.lazy(() => import('./components/PartyNetworkGraphScreen').then(module => ({ default: module.PartyNetworkGraphScreen })));
`;

const importHook = "import { malaysiaSeatsData } from './data/kelantan';\n";
code = code.replace(importHook, lazyImports + importHook);

// Wrap usages in Suspense
const ecoPanelRegex = /\{showEconomicPanel && \(\s*<EconomicPanel([\s\S]*?)\/>\s*\)\}/;
code = code.replace(ecoPanelRegex, `{showEconomicPanel && (
                <React.Suspense fallback={<div className="p-4 bg-white/10 text-white rounded">Loading Economy...</div>}>
                    <EconomicPanel$1/>
                </React.Suspense>
            )}`);

const elHistoryRegex = /\{showElectionHistory && \(\s*<ElectionHistoryScreen([\s\S]*?)\/>\s*\)\}/;
code = code.replace(elHistoryRegex, `{showElectionHistory && (
                <React.Suspense fallback={<div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
                    <ElectionHistoryScreen$1/>
                </React.Suspense>
            )}`);

const partyGraphRegex = /\{showPartyList && \(\s*<PartyNetworkGraphScreen([\s\S]*?)\/>\s*\)\}/;
code = code.replace(partyGraphRegex, `{showPartyList && (
                <React.Suspense fallback={<div className="absolute inset-0 bg-gray-900/50 flex flex-col items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div><p>Loading Graph...</p></div>}>
                    <PartyNetworkGraphScreen$1/>
                </React.Suspense>
            )}`);

fs.writeFileSync('App.tsx', code);
