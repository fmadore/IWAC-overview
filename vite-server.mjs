#!/usr/bin/env node

/**
 * Simple Vite-based server for testing the IWAC Overview application
 * This helps avoid CORS issues and MIME type problems when testing locally
 */

import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log('🌐 IWAC Overview Vite Server Helper');
  console.log('===================================');
  console.log('This script will start a Vite server to test the IWAC Overview application');
  console.log('This avoids CORS issues and MIME type problems when testing locally');
  
  console.log('\n❓ Which directory would you like to serve?');
  console.log('1. Current directory (includes test-deploy.html and docs/)');
  console.log('2. docs/ directory only (just the built application)');
  
  const dirAnswer = await new Promise(resolve => {
    rl.question('Enter your choice (1 or 2): ', resolve);
  });
  
  let directory = '.';
  if (dirAnswer === '2') {
    directory = './docs';
    
    // Check if docs directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'docs'))) {
      console.log('\n❌ The docs/ directory does not exist. Have you run "npm run build" yet?');
      const buildAnswer = await new Promise(resolve => {
        rl.question('Would you like to run the build now? (y/n): ', resolve);
      });
      
      if (buildAnswer.toLowerCase() === 'y') {
        console.log('\n🔨 Running build...');
        try {
          import('child_process').then(({ execSync }) => {
            execSync('npm run build', { stdio: 'inherit' });
            console.log('\n✅ Build completed successfully!');
            startViteServer(directory);
          });
        } catch (error) {
          console.error('\n❌ Build failed. Error: ' + error.message);
          process.exit(1);
        }
      } else {
        console.log('\nPlease run "npm run build" first, then try again.');
        process.exit(1);
      }
    } else {
      startViteServer(directory);
    }
  } else {
    startViteServer(directory);
  }
  
  rl.close();
}

async function startViteServer(directory) {
  try {
    console.log(`\n🚀 Starting Vite server for directory: ${directory}`);
    
    const server = await createServer({
      root: directory,
      server: {
        port: 3000,
        strictPort: true,
        host: true,
        cors: true,
      },
      preview: {
        port: 3000,
        strictPort: true,
        host: true,
        cors: true,
      },
      // Ensure proper MIME types for all JavaScript files
      assetsInclude: ['**/*.js', '**/*.mjs'],
    });
    
    await server.listen();
    
    const info = server.config.server;
    const port = info.port;
    
    console.log(`\nServer running at: http://localhost:${port}`);
    console.log(`To access test-deploy.html: http://localhost:${port}/test-deploy.html`);
    console.log(`To access the app directly: http://localhost:${port}/docs/`);
    console.log('\nPress Ctrl+C to stop the server\n');
    
    // Keep the process running
    process.stdin.resume();
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n🛑 Server stopped');
      server.close().then(() => process.exit(0));
    });
    
  } catch (error) {
    console.error('\n❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
}); 