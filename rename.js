const fs = require('fs');
const path = require('path');

const directoriesToScan = [
  path.join(__dirname, 'frontend', 'src'),
  path.join(__dirname, 'frontend', 'public'),
  path.join(__dirname, 'backend', 'src'),
];

function scanAndReplace(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanAndReplace(fullPath);
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx|json|md|html|css)$/.test(file)) {
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
}

directoriesToScan.forEach(scanAndReplace);
console.log('Renaming complete.');
