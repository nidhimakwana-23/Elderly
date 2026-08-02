import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { openapiSpec } from '../src/openapi.js';

const rootDir = process.cwd();
const openapiPath = path.join(rootDir, 'openapi.json');
const outputDir = path.join(rootDir, 'src', 'generated-client');

console.log('📝 Writing openapi.json...');
fs.writeFileSync(openapiPath, JSON.stringify(openapiSpec, null, 2), 'utf-8');

console.log('🚀 Running openapi-generator-cli...');
const command = `npx @openapitools/openapi-generator-cli generate -i "${openapiPath}" -g typescript-fetch -o "${outputDir}"`;
execSync(command, { stdio: 'inherit' });

if (fs.existsSync(path.join(outputDir, 'package.json'))) {
  const pkgJsonPath = path.join(outputDir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  
  if (pkgJson.scripts && pkgJson.scripts.build) {
    console.log('🔨 Building generated client...');
    execSync('npm run build', { cwd: outputDir, stdio: 'inherit' });
  }
}

console.log('✅ Generated TypeScript client successfully in src/generated-client');
