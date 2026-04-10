import fs from 'fs';

let code = fs.readFileSync('api/_server.ts', 'utf8');

code = code.replace(/res\.status\(500\)\.json\(\{ error: "Database not configured" \}\)/g, 'res.status(400).json({ error: "Database not configured" })');
code = code.replace(/res\.status\(500\)\.json\(\{ success: false, message: "Database not configured" \}\)/g, 'res.status(400).json({ success: false, message: "Database not configured" })');
code = code.replace(/res\.status\(500\)\.json\(\{ error: 'Supabase not configured' \}\)/g, "res.status(400).json({ error: 'Supabase not configured' })");

fs.writeFileSync('api/_server.ts', code);
console.log('Done replacing 500 with 400 for Database not configured');
