const fs = require('fs');
const path = require('path');

const filesToScan = [
  path.join(__dirname, 'frontend', 'package.json'),
  path.join(__dirname, 'backend', 'package.json'),
  path.join(__dirname, 'frontend', '.env'),
  path.join(__dirname, 'frontend', '.env.local'),
  path.join(__dirname, 'backend', '.env'),
  path.join(__dirname, 'package.json'),
  path.join(__dirname, 'README.md')
];

for (const fullPath of filesToScan) {
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    let newContent = content;

    // Replace EasyPG -> U9PGs
    newContent = newContent.replace(/EasyPG/g, 'U9PGs');
    // Replace easypg -> u9pgs
    newContent = newContent.replace(/easypg/g, 'u9pgs');
    // Replace Easy PG -> U9PGs
    newContent = newContent.replace(/Easy PG/g, 'U9PGs');

    if (content !== newContent) {
      fs.writeFileSync(fullPath, newContent, 'utf8');
      console.log(`Updated: ${fullPath}`);
    }
  }
}
console.log('Root renaming complete.');
