#!/usr/bin/env node

/**
 * Server Diagnostics Script for Agrinova API
 * Comprehensive diagnostics for port conflicts, server health, and configuration
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class ServerDiagnostics {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.apiPort = 8080;
    this.webPort = 3000;
  }

  async checkPortStatus(port) {
    try {
      if (this.isWindows) {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          const processes = [];
          
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            
            try {
              const { stdout: processInfo } = await execAsync(`tasklist | findstr ${pid}`);
              processes.push({
                port,
                pid,
                process: processInfo.trim().split(/\s+/)[0],
                line: line.trim()
              });
            } catch (e) {
              processes.push({
                port,
                pid,
                process: 'Unknown',
                line: line.trim()
              });
            }
          }
          
          return { inUse: true, processes };
        }
      } else {
        const { stdout } = await execAsync(`lsof -i :${port}`);
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n').slice(1); // Skip header
          const processes = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              port,
              pid: parts[1],
              process: parts[0],
              line: line.trim()
            };
          });
          return { inUse: true, processes };
        }
      }
      
      return { inUse: false, processes: [] };
    } catch (error) {
      return { inUse: false, processes: [], error: error.message };
    }
  }

  async runDiagnostics() {
    console.log('🔍 Agrinova Server Diagnostics\n');
    
    // Check port status
    console.log('📡 PORT STATUS');
    console.log('='.repeat(50));
    
    const apiPortStatus = await this.checkPortStatus(this.apiPort);
    const webPortStatus = await this.checkPortStatus(this.webPort);
    
    console.log(`API Port ${this.apiPort}: ${apiPortStatus.inUse ? '🔴 IN USE' : '🟢 AVAILABLE'}`);
    if (apiPortStatus.inUse) {
      apiPortStatus.processes.forEach(proc => {
        console.log(`  └─ PID: ${proc.pid}, Process: ${proc.process}`);
      });
    }
    
    console.log(`Web Port ${this.webPort}: ${webPortStatus.inUse ? '🔴 IN USE' : '🟢 AVAILABLE'}`);
    if (webPortStatus.inUse) {
      webPortStatus.processes.forEach(proc => {
        console.log(`  └─ PID: ${proc.pid}, Process: ${proc.process}`);
      });
    }
    
    // Provide recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    if (apiPortStatus.inUse) {
      console.log('🔧 API Port Conflict Detected:');
      console.log('   1. Run: npm run port:kill to free the port');
      console.log('   2. Or run: npm run port:find to find alternative port');
      console.log('   3. Check for duplicate server instances');
    }
    
    if (!apiPortStatus.inUse && !webPortStatus.inUse) {
      console.log('✅ All ports are available - servers should start normally');
      console.log('   Run: npm run dev:api to start API server');
      console.log('   Run: npm run dev:web to start web application');
    }
  }
}

// Run diagnostics if called directly
if (require.main === module) {
  const diagnostics = new ServerDiagnostics();
  diagnostics.runDiagnostics().catch(error => {
    console.error('❌ Diagnostics failed:', error);
    process.exit(1);
  });
}

module.exports = ServerDiagnostics;
