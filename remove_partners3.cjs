const fs = require('fs');
const file = 'c:/Users/Ruan/Desktop/WebApps/FocinhoApp/focinhoapp/src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const s1 = "...partners.map(p => part-\),";
content = content.replace(s1, "");
content = content.replace(s1, "");

const s2 = "// Partners";
const i2 = content.indexOf(s2);
if (i2 > 0) {
   const e2 = content.indexOf("})),", i2);
   if (e2 > 0) {
      content = content.substring(0, i2) + content.substring(e2 + 4);
   }
}

const s3 = "{/* Partners Management */}";
const i3 = content.indexOf(s3);
if (i3 > 0) {
   const e3 = content.indexOf("{/* Admin Config */}", i3);
   if (e3 > 0) {
      content = content.substring(0, i3) + content.substring(e3);
   }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Removed 5th batch');