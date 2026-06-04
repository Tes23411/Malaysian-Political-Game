import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '../public/data');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const file = fs.createWriteStream(path.join(dir, 'mys_population.tif'));
https.get('https://data.worldpop.org/GIS/Population/Global_2000_2020_1km/2020/MYS/mys_ppp_2020_1km_Aggregated.tif', function(response) {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download complete');
  });
}).on('error', (err) => {
  fs.unlink(path.join(dir, 'mys_population.tif'));
  console.error('Error downloading:', err.message);
});
