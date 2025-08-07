#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = path.join(path.dirname(__dirname), '.env');

console.log('🧹 Clearing Telegram session...');

try {
  if (fs.existsSync(envFile)) {
    let envContent = fs.readFileSync(envFile, 'utf8');
    const lines = envContent.split('\n');
    
    // Update the TELEGRAM_SESSION line
    let updated = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('TELEGRAM_SESSION=')) {
        lines[i] = 'TELEGRAM_SESSION=';
        updated = true;
        break;
      }
    }
    
    if (updated) {
      fs.writeFileSync(envFile, lines.join('\n'), 'utf8');
      console.log('✅ Session cleared from .env file');
    } else {
      console.log('ℹ️  No TELEGRAM_SESSION found in .env file');
    }
  } else {
    console.log('ℹ️  No .env file found');
  }

  // Also remove old session file if it exists
  const oldSessionFile = path.join(path.dirname(__dirname), 'telegram_session.session');
  if (fs.existsSync(oldSessionFile)) {
    fs.unlinkSync(oldSessionFile);
    console.log('✅ Removed old session file');
  }
} catch (error) {
  console.error('❌ Error clearing session:', error);
}

console.log('\n📝 Next time you run the app, you will need to authenticate again.');
