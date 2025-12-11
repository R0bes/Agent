/**
 * Service Thread Wrapper
 * 
 * Wrapper script to run serviceThread.ts with tsx in development.
 * This is needed because Worker Threads can't directly execute TypeScript files.
 * 
 * This file must be executed with: node --loader tsx/esm serviceThreadWrapper.mjs
 */

import { register } from 'tsx/esm/api';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register tsx loader for ESM
register();

// Import and run the actual service thread
const serviceThreadPath = join(__dirname, 'serviceThread.ts');
const serviceThreadUrl = pathToFileURL(serviceThreadPath).href;
await import(serviceThreadUrl);

