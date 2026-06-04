const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const targetRegex = /\/\/\s*2\.\s*Population\s*Growth\s*&\s*Monthly\s*Economic\s*Update\s*\(on\s*the\s*1st\)\s*if\s*\(nextDate\.getDate\(\)\s*===\s*1\)\s*\{\s*jobQueueRef\.current\.push\(\(\)\s*=>\s*\{\s*\/\/\s*Population\s*growth\s*setDemographicsMap\(prevMap\s*=>\s*\{[\s\S]*?return\s*newMap;\s*\}\);/m;


const replacement = `      // 2. Population Growth (Yearly) & Monthly Economic Update (on the 1st)
      if (nextDate.getDate() === 1) {
          jobQueueRef.current.push(() => {
              // Population growth (throttled to once a year to avoid cascading memo updates)
              if (nextDate.getMonth() === 0) {
                  setDemographicsMap(prevMap => {
                  const newMap = new Map<string, Demographics>(prevMap);
                  newMap.forEach((demo, code) => {
                      const classificationUpper = typeof demo.urbanRuralClassification2018 === 'string'
                      ? demo.urbanRuralClassification2018.toUpperCase() : '';

                      let baseRate = (classificationUpper === 'URBAN' ? 0.000925
                      : classificationUpper === 'SEMI URBAN' ? 0.0005167
                      : 0.000125) * 12;

                      // --- MISSION TREE BONUS ---
                      // Determine dominant ethnicity of this seat to apply the right multiplier
                      const malayPct  = demo.malayPercent  ?? 0;
                      const chinesePct = demo.chinesePercent ?? 0;
                      const indianPct = demo.indiansPercent  ?? 0;
                      const dominantEth: Ethnicity = malayPct >= chinesePct && malayPct >= indianPct ? 'Malay'
                      : chinesePct >= indianPct ? 'Chinese' : 'Indian';

                      const missionBonus = getPopulationGrowthMultiplier(
                      dominantEth,
                      missionTreeState.populationGrowthMultipliers
                      ) * 12;
                      // -------------------------

                      const growth = Math.ceil(demo.totalElectors * (baseRate + missionBonus));
                      newMap.set(code, { ...demo, totalElectors: demo.totalElectors + growth });
                  });
                  return newMap;
                  });
              }`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync('App.tsx', code);
