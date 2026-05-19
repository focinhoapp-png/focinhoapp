const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('const [partners, setPartners] = useState<Partner[]>')) skip = true;
  if (skip && line.includes('const [partnerMessage, setPartnerMessage] = useState<string | null>(null);')) {
    skip = false;
    continue; // skip this line too
  }
  
  if (line.includes('const handleSavePartner = async ')) skip = true;
  if (skip && line.includes('const getDashboardGreeting = () => {')) {
    skip = false;
    // Don't continue because we want to keep getDashboardGreeting
  }

  if (line.includes('{/* Partners Management */}')) skip = true;
  if (skip && line.includes('{/* Admin Config */}')) {
    skip = false;
  }

  if (line.includes('onClick={() => setAccountSubView(\\'partners\\')}')) {
      // It's a button. Let's just skip it and the surrounding button tags
      // Actually, since it spans multiple lines, we can't easily skip it like this.
  }

  if (!skip) {
     newLines.push(line);
  }
}
fs.writeFileSync(file, newLines.join('\n'), 'utf8');
console.log('Done lines!');