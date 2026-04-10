import fs from 'fs';

let code = fs.readFileSync('api/_server.ts', 'utf8');
code = code.replace(/res\.status\(500\)/g, 'res.status(400)');
fs.writeFileSync('api/_server.ts', code);
console.log('Done replacing all 500s with 400s');
