const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Remove filteredPartners
c = c.replace(/const filteredPartners = useMemo\(\(\) => \{[\s\S]*?\}, \[partners, activePartnerFilter\]\);/, '');

// Remove partners from notifications count
c = c.replace(/\.\.\.partners\.map\(p => `part-\$\{p\.id\}`\),/, '');

// Remove other partners references
c = c.replace(/partners={partners}/g, '');
c = c.replace(/partners\.length/g, '0');

fs.writeFileSync('src/App.tsx', c);
console.log('Fixed partners references in App.tsx');
