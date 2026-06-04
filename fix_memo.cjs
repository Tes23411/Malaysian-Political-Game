const fs = require('fs');
['components/GameControlPanel.tsx', 'components/ElectionMapControlPanel.tsx', 'components/EventModal.tsx', 'components/CountryInfoPanel.tsx', 'components/StateInfoPanel.tsx', 'components/PartyListPanel.tsx', 'components/AlliancePanel.tsx'].forEach(file => {
    if (fs.existsSync(file)) {
        let code = fs.readFileSync(file, 'utf8');
        // Wrap the default export or the main function in React.memo if it isn't already
        // Usually it's `const ComponentName: React.FC<Props> = (...) => { ... }; export default ComponentName;`
        
        // Let's just do a naive React.memo wrapping of the `export default`
        if (code.includes('export default ') && !code.includes('React.memo')) {
            const match = code.match(/export default ([A-Za-z0-9_]+);/);
            if (match && match[1]) {
                const componentName = match[1];
                code = code.replace(new RegExp(`export default ${componentName};`), `export default React.memo(${componentName});`);
                
                if (!code.includes('import React')) {
                    code = "import React from 'react';\n" + code;
                } else if (!code.includes('React.') && code.includes('import {')) {
                    // It imports specific things from react, but needs React.memo
                    // Easier to just use `memo`
                    code = code.replace(`export default React.memo(${componentName});`, `export default memo(${componentName});`);
                    if (!code.includes('memo') && code.includes('react')) {
                        code = code.replace(/import\s+\{([^}]+)\}\s+from\s+'react';/, "import { $1, memo } from 'react';");
                    } else if (code.includes('import React')) {
                        code = code.replace(`export default memo(${componentName});`, `export default React.memo(${componentName});`);
                    }
                }
                
                fs.writeFileSync(file, code);
            }
        }
    }
});
