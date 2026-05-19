const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove orphaned return before // Fetch Events
const orphan1 = "return () => { supabase.removeChannel(channel); };\r\n    }, []);\r\n\r\n  // Fetch Events";
content = content.replace(orphan1, "  // Fetch Events");
const orphan1b = "return () => { supabase.removeChannel(channel); };\n    }, []);\n\n  // Fetch Events";
content = content.replace(orphan1b, "  // Fetch Events");

const orphan1c = "return () => { supabase.removeChannel(channel); };\r\n  }, []);\r\n\r\n  // Fetch Events";
content = content.replace(orphan1c, "  // Fetch Events");
const orphan1d = "return () => { supabase.removeChannel(channel); };\n  }, []);\n\n  // Fetch Events";
content = content.replace(orphan1d, "  // Fetch Events");

// 2. Remove the partners button in Account View
const btnStart = "<button\r\n                      onClick={() => setAccountSubView('partners')}";
const btnStart2 = "<button\n                      onClick={() => setAccountSubView('partners')}";

let startIdx = content.indexOf(btnStart);
if (startIdx === -1) startIdx = content.indexOf(btnStart2);

if (startIdx !== -1) {
   let endIdx = content.indexOf("</button>", startIdx);
   if (endIdx !== -1) {
      content = content.substring(0, startIdx) + content.substring(endIdx + 9);
   }
}

// Just in case it's on the same line
const btnStart3 = "onClick={() => setAccountSubView('partners')}";
const i3 = content.indexOf(btnStart3);
if (i3 !== -1) {
   let startBtn = content.lastIndexOf("<button", i3);
   let endBtn = content.indexOf("</button>", i3);
   if (startBtn !== -1 && endBtn !== -1) {
      content = content.substring(0, startBtn) + content.substring(endBtn + 9);
   }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed orphans.');