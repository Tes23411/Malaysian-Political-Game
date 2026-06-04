const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/useState<Map<string, OppositionAIResult>>\(new Map\(\)\);/g, `useState<Map<string, OppositionAIResult>>(() => new Map());`);
code = code.replace(/useState<Set<string>>\(new Map\(\)\);/g, `useState<Set<string>>(() => new Set());`);
code = code.replace(/useState<Map<string, Demographics>>\(new Map\(\)\);/g, `useState<Map<string, Demographics>>(() => new Map());`);
code = code.replace(/useState<StrongholdMap>\(new Map\(\)\);/g, `useState<StrongholdMap>(() => new Map());`);
code = code.replace(/useState<Map<string, StateGovernment>>\(new Map\(\)\);/g, `useState<Map<string, StateGovernment>>(() => new Map());`);

fs.writeFileSync('App.tsx', code);
