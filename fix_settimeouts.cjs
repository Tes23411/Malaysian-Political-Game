const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/setTimeout\(\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*0\s*\);/g, (match, body) => {
    return "jobQueueRef.current.push(() => {" + body + "});";
});
code = code.replace(/setTimeout\(\s*\(\)\s*=>\s*([^{][\s\S]*?),\s*0\s*\);/g, (match, body) => {
    return "jobQueueRef.current.push(() => " + body + ");";
});
fs.writeFileSync('App.tsx', code);
