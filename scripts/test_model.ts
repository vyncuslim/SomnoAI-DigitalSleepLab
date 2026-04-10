
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

async function test() {
  const modelPath = path.join(process.cwd(), 'digit_model.keras');
  console.log('Checking model at:', modelPath);
  if (fs.existsSync(modelPath)) {
    try {
      const zip = new AdmZip(modelPath);
      const zipEntries = zip.getEntries();
      console.log('Zip Entries:');
      zipEntries.forEach(entry => console.log('-', entry.entryName));
      
      const configEntry = zipEntries.find(e => e.entryName === 'config.json');
      if (configEntry) {
        const config = JSON.parse(configEntry.getData().toString('utf8'));
        console.log('Model Config found.');
        console.log('Layers:', config.config.layers.map((l: any) => l.class_name));
      }
    } catch (e) {
      console.error('Error inspecting zip:', e);
    }
  } else {
    console.log('File does not exist.');
  }
}

test();
