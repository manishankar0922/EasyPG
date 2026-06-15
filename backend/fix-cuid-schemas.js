const fs = require('fs');
const path = require('path');

const schemasDir = path.join(__dirname, 'src', 'schemas');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('.cuid()')) {
        content = content.replace(/\.cuid\(\)/g, '.min(5)');
        fs.writeFileSync(fullPath, content);
        console.log('Fixed:', file);
      }
    }
  }
}

processDir(schemasDir);
console.log('Done.');
