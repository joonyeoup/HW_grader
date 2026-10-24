/**
 * Obfuscation Script for Chrome Extension
 * Protects source code before publishing to Chrome Web Store
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

// Configuration for obfuscation
const obfuscationOptions = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false, // Set to true for extra protection (may break extension)
  debugProtectionInterval: 0,
  disableConsoleOutput: false, // Keep console for debugging
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false, // Don't rename globals (important for Chrome APIs)
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

// Files to obfuscate
const filesToObfuscate = [
  'background.js',
  'content.js',
  'popup.js'
];

// Files/folders to copy without obfuscation
const filesToCopy = [
  'manifest.json',
  'popup.html',
  'styles.css',
  'icons'
];

// Create dist folder if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

console.log('🔒 Starting code obfuscation...\n');

// Obfuscate JavaScript files
filesToObfuscate.forEach(filename => {
  const filePath = path.join(__dirname, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Warning: ${filename} not found, skipping...`);
    return;
  }

  console.log(`🔐 Obfuscating ${filename}...`);

  const code = fs.readFileSync(filePath, 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);

  const outputPath = path.join(distDir, filename);
  fs.writeFileSync(outputPath, obfuscated.getObfuscatedCode());

  const originalSize = Buffer.byteLength(code, 'utf8');
  const obfuscatedSize = Buffer.byteLength(obfuscated.getObfuscatedCode(), 'utf8');
  const increase = ((obfuscatedSize / originalSize - 1) * 100).toFixed(1);

  console.log(`   ✓ ${filename} obfuscated`);
  console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
  console.log(`   Obfuscated: ${(obfuscatedSize / 1024).toFixed(2)} KB (+${increase}%)\n`);
});

// Copy non-JavaScript files
console.log('📋 Copying other files...\n');

filesToCopy.forEach(item => {
  const sourcePath = path.join(__dirname, item);
  const destPath = path.join(distDir, item);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠️  Warning: ${item} not found, skipping...`);
    return;
  }

  const stats = fs.statSync(sourcePath);

  if (stats.isDirectory()) {
    // Copy directory recursively
    console.log(`📁 Copying directory ${item}/`);
    copyDirectory(sourcePath, destPath);
  } else {
    // Copy file
    console.log(`📄 Copying ${item}`);
    fs.copyFileSync(sourcePath, destPath);
  }
});

// Helper function to copy directory recursively
function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const files = fs.readdirSync(source);

  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    const stats = fs.statSync(sourcePath);

    if (stats.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
}

console.log('\n✅ Obfuscation complete!\n');
console.log('📦 Your obfuscated extension is ready in the ./dist/ folder');
console.log('📋 Next steps:');
console.log('   1. Test the extension: Load ./dist/ in chrome://extensions/');
console.log('   2. Zip the dist folder: cd dist && zip -r ../extension-obfuscated.zip .');
console.log('   3. Upload to Chrome Web Store\n');
