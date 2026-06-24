const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace primary colors: purple/indigo to red/orange
    content = content.replace(/violet-/g, 'red-');
    content = content.replace(/indigo-/g, 'orange-');
    content = content.replace(/fuchsia-/g, 'red-'); 
    
    // Replace gray with stone (warm gray-brown)
    content = content.replace(/gray-/g, 'stone-');
    
    // Make body pure white in layout.tsx, but keep stone-50 for dark mode fallback if needed
    if (filePath.endsWith('layout.tsx')) {
      content = content.replace('bg-stone-50', 'bg-white'); // it was bg-gray-50 originally, script replaces gray to stone, so let's just do it carefully.
    }
    
    // Solidify edit modals
    if (filePath.includes('EditProjectDialog.tsx') || filePath.includes('EditGithubLinkDialog.tsx')) {
      content = content.replace('bg-white/95', 'bg-white');
    }
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
