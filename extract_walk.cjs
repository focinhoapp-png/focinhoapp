const fs = require('fs');
const lines = fs.readFileSync('src/App.tsx', 'utf8').split('\n');

// Find start of Walk View
const startIdx = lines.findIndex(l => l.includes("{view === 'walk' && ("));
if (startIdx === -1) {
  console.log("Could not find walk view start");
  process.exit(1);
}

// Find end. We know it's around 6500. Let's find the matching parenthesis.
let endIdx = startIdx;
let braceCount = 0;
for (let i = startIdx; i < lines.length; i++) {
  const line = lines[i];
  // Simple heuristic for this block
  if (line.includes("{view === 'lost_pets' && (")) {
    endIdx = i - 1;
    break;
  }
}

const walkJsx = lines.slice(startIdx + 1, endIdx).join('\n'); // omit the wrapper

fs.mkdirSync('src/screens', {recursive:true});
fs.writeFileSync('src/screens/WalkScreen.tsx', `import React from 'react';
import { ChevronLeft, MapPin, Loader2, Play, Square, Trophy } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';

export function WalkScreen(props: any) {
  const { } = props;
  return (
    <>
${walkJsx}
    </>
  );
}
`);
console.log('Extracted to WalkScreen.tsx');
