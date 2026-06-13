/**
 * File logger đơn giản cho main process.
 */

import fs from 'fs';
import path from 'path';

const electronModule = require('electron') as typeof import('electron') | string;
const app = typeof electronModule === 'string' ? null : electronModule.app;

function logDir(): string {
   return path.join(app?.getPath?.('userData') ?? process.cwd(), 'logs');
}

function logPath(date = new Date()): string {
   const day = date.toISOString().slice(0, 10);
   return path.join(logDir(), `app-${day}.log`);
}

function serializeError(error: unknown): string {
   if (error instanceof Error) return `${error.message}\n${error.stack ?? ''}`;
   return String(error ?? '');
}

function write(level: 'INFO' | 'ERROR', message: string): void {
   fs.mkdirSync(logDir(), { recursive: true });
   const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
   fs.appendFileSync(logPath(), line, 'utf-8');
}

export function logInfo(message: string): void {
   write('INFO', message);
}

export function logError(message: string, error?: unknown): void {
   write('ERROR', error === undefined ? message : `${message}: ${serializeError(error)}`);
}

export function cleanupOldLogs(retentionDays = 30): number {
   const dir = logDir();
   if (!fs.existsSync(dir)) return 0;

   const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
   let removed = 0;

   for (const file of fs.readdirSync(dir)) {
      if (!/^app-\d{4}-\d{2}-\d{2}\.log$/.test(file)) continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < threshold) {
         fs.unlinkSync(fullPath);
         removed += 1;
      }
   }

   return removed;
}

export function getLogDir(): string {
   return logDir();
}
