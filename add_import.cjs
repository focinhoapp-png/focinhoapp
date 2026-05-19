const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes("import { saveAs } from 'file-saver';"));
if (idx !== -1) {
    lines.splice(idx + 1, 0, "import { BottomNavigation } from './components/BottomNavigation';");
    fs.writeFileSync('src/App.tsx', lines.join('\n'));
    console.log("Import added!");
} else {
    console.log("Could not find file-saver import");
}
