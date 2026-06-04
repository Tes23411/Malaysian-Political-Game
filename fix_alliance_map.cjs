const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/const allianceMemberMap = new Map<string, string>\(\);\s*currentAlliances\.forEach\(a => \{\s*a\.memberPartyIds\.forEach\(pid => allianceMemberMap\.set\(pid, a\.id\)\);\s*\}\);/g, `const allianceMemberMap = allianceToPartyMapRef.current;`);
code = code.replace(/const allianceMemberMap = new Map<string, string>\(\);\s*alliances\.forEach\(alliance => \{\s*alliance\.memberPartyIds\.forEach\(pid => \{\s*allianceMemberMap\.set\(pid, alliance\.id\);\s*\}\);\s*\}\);/g, `const allianceMemberMap = allianceToPartyMapRef.current;`);

fs.writeFileSync('App.tsx', code);
