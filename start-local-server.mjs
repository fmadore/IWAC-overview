#!/usr/bin/env node

/**
 * Simple script to start a local server for testing the IWAC Overview application
 * This helps avoid CORS issues when testing locally
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if serve or http-server is installed
function checkServerAvailability() {
  try {
    execSync('npx serve --version', { stdio: 'ignore' });
    return { serve: true };
  } catch (e) {
    try {
      execSync('npx http-server --version', { stdio: 'ignore' });
      return { httpServer: true };
    } catch (e) {
      return { serve: false, httpServer: false };
    }
  }
}

// Install server if needed
function installServer(serverType) {
  console.log(`\nInstalling ${serverType} package...`);
  try {
    execSync(`npm install -g ${serverType}`, { stdio: 'inherit' });
    console.log(`\n✅ ${serverType} installed successfully!`);
    return true;
  } catch (error) {
    console.error(`\n❌ Failed to install ${serverType}. Error: ${error.message}`);
    return false;
  }
}

// Start the server
function startServer(serverType, directory) {
  const port = serverType === 'serve' ? 3000 : 8080;
  
  // Add options to ensure proper MIME types
  let command;
  if (serverType === 'serve') {
    // serve doesn't need special options for MIME types
    command = `npx serve ${directory}`;
  } else {
    // http-server needs explicit MIME type configuration
    command = `npx http-server ${directory} -p ${port} --cors -c-1 -a localhost -e js,mjs`;
  }
  
  console.log(`\n🚀 Starting ${serverType} for directory: ${directory}`);
  console.log(`\nServer will be available at: http://localhost:${port}`);
  console.log('To access test-deploy.html: http://localhost:' + port + '/test-deploy.html');
  console.log('To access the app directly: http://localhost:' + port + '/docs/');
  console.log('\nPress Ctrl+C to stop the server\n');
  
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    // This will execute when the user presses Ctrl+C
    console.log('\n🛑 Server stopped');
  }
}

// Main function
async function main() {
  console.log('🌐 IWAC Overview Local Server Helper');
  console.log('===================================');
  console.log('This script will help you start a local server to test the IWAC Overview application');
  console.log('This avoids CORS issues that occur when opening HTML files directly from the file system');
  
  const availability = checkServerAvailability();
  
  let serverType;
  
  if (availability.serve) {
    serverType = 'serve';
  } else if (availability.httpServer) {
    serverType = 'http-server';
  } else {
    console.log('\n❓ No server package found. Which one would you like to install?');
    console.log('1. serve (recommended)');
    console.log('2. http-server');
    
    const answer = await new Promise(resolve => {
      rl.question('Enter your choice (1 or 2): ', resolve);
    });
    
    if (answer === '1') {
      if (installServer('serve')) {
        serverType = 'serve';
      } else {
        process.exit(1);
      }
    } else if (answer === '2') {
      if (installServer('http-server')) {
        serverType = 'http-server';
      } else {
        process.exit(1);
      }
    } else {
      console.log('Invalid choice. Exiting...');
      process.exit(1);
    }
  }
  
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
          execSync('npm run build', { stdio: 'inherit' });
          console.log('\n✅ Build completed successfully!');
        } catch (error) {
          console.error('\n❌ Build failed. Error: ' + error.message);
          process.exit(1);
        }
      } else {
        console.log('\nPlease run "npm run build" first, then try again.');
        process.exit(1);
      }
    }
  }
  
  rl.close();
  startServer(serverType, directory);
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
}); 