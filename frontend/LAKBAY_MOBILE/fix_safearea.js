const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'screens');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes("from 'react-native'") && content.includes("SafeAreaView") && !content.includes("react-native-safe-area-context")) {
    content = content.replace(/(import\s+{)([^}]*)(}\s+from\s+['"]react-native['"])/g, (match, p1, p2, p3) => {
      let parts = p2.split(',').map(s => s.trim()).filter(s => s && s !== 'SafeAreaView');
      return p1 + ' ' + parts.join(', ') + ' ' + p3;
    });
    content = content.replace(/(import React.*?;\n)/, "$1import { SafeAreaView } from 'react-native-safe-area-context';\n");
    fs.writeFileSync(p, content, 'utf8');
  }
}
console.log('done');
