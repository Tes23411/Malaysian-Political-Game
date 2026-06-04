const fs = require('fs');
const data = fs.readFileSync('data/demographics.csv', 'utf8');
const lines = data.trim().split('\n');
const newHeader = "UNIQUE CODE,STATE,PARLIAMENTARY CONSTITUENCY CODE,PARLIAMENTARY CONSTITUENCY NAME,TOTAL ELECTORS,MALAY (%),CHINESE (%),INDIANS (%),BUMIPUTERA SABAH(MUSLIM) (%),BUMIPUTERA SABAH(NON-MUSLIM) (%),BUMIPUTERA SARAWAK(MUSLIM) (%),BUMIPUTERA SARAWAK(NON-MUSLIM) (%),ORANG ASLI (%),OTHERS (%),URBAN-RURAL CLASSIFICATION (2018)";

const newLines = [newHeader];
for(let i=1; i<lines.length; i++) {
   const cols = lines[i].split(',');
   if(cols.length < 11) { newLines.push(lines[i]); continue; }
   
   const newCols = [
     cols[0], cols[1], cols[2], cols[3], cols[4], cols[5], cols[6], cols[7],
     "0.00", "0.00", "0.00", "0.00", "0.00", cols[8], cols[10]
   ];
   newLines.push(newCols.join(','));
}
fs.writeFileSync('data/demographics.csv', newLines.join('\n'), 'utf8');
