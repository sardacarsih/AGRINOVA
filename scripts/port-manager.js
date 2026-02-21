#!/usr/bin/env node

/**
 * Port Manager Script for Agrinova API Server
 * Manages port conflicts and provides utilities for server startup
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class PortManager {
  constructor(port = 8080) {
    this.port = port;
    this.isWindows = process.platform === 'win32';
  }

  /**
   * Check if port is in use
   */
  async isPortInUse() {
    try {
      if (this.isWindows) {
        const { stdout } = await execAsync(`netstat -ano | findstr :${this.port}`);
        return stdout.trim().length > 0;
      } else {
        const { stdout } = await execAsync(`lsof -i :${this.port}`);
        return stdout.trim().length > 0;
      }
    } catch (error) {
      // If command fails, port is likely available
      return false;
    }
  }

  /**
   * Get process details using the port
   */
  async getPortProcess() {
    try {
      if (this.isWindows) {
        const { stdout } = await execAsync(`netstat -ano | findstr :${this.port}`);
        const lines = stdout.trim().split('\n');
        
        if (lines.length === 0) return null;
        
        const pid = lines[0].trim().split(/\s+/).pop();
        const { stdout: processInfo } = await execAsync(`tasklist | findstr ${pid}`);
        
        return {
          pid: pid,
          processName: processInfo.trim().split(/\s+/)[0],
          details: processInfo.trim()
        };
      } else {
        const { stdout } = await execAsync(`lsof -i :${this.port}`);
        const lines = stdout.trim().split('\n');
        if (lines.length < 2) return null;
        
        const processLine = lines[1].trim().split(/\s+/);
        return {
          pid: processLine[1],
          processName: processLine[0],
          details: lines[1]
        };
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Kill process using the port
   */
  async killPortProcess() {
    try {
      const processInfo = await this.getPortProcess();
      if (!processInfo) {
        console.log(`✅ Port ${this.port} is already free`);
        return true;
      }

      console.log(`🔍 Found process using port ${this.port}:`);
      console.log(`   PID: ${processInfo.pid}`);
      console.log(`   Process: ${processInfo.processName}`);
      console.log(`   Details: ${processInfo.details}`);

      if (this.isWindows) {
        await execAsync(`powershell "Stop-Process -Id ${processInfo.pid} -Force"`);
      } else {
        await execAsync(`kill -9 ${processInfo.pid}`);
      }

      console.log(`✅ Successfully killed process ${processInfo.pid} (${processInfo.processName})`);
      
      // Wait a moment and verify
      await new Promise(resolve => setTimeout(resolve, 1000));
      const stillInUse = await this.isPortInUse();
      
      if (stillInUse) {
        console.log(`⚠️  Warning: Port ${this.port} may still be in use`);
        return false;
      } else {
        console.log(`✅ Port ${this.port} is now available`);
        return true;
      }
    } catch (error) {
      console.error(`❌ Error killing process on port ${this.port}:`, error.message);
      return false;
    }
  }

  /**
   * Find alternative available port
   */
  async findAvailablePort(startPort = this.port) {
    for (let port = startPort; port <= startPort + 100; port++) {
      const tempManager = new PortManager(port);
      const inUse = await tempManager.isPortInUse();
      if (!inUse) {
        return port;
      }
    }
    throw new Error(`No available port found in range ${startPort}-${startPort + 100}`);
  }

  /**
   * Safe server startup with port management
   */
  async safeStartup() {
    console.log(`🚀 Starting port management for port ${this.port}...`);
    
    const inUse = await this.isPortInUse();
    
    if (!inUse) {
      console.log(`✅ Port ${this.port} is available`);
      return this.port;
    }

    console.log(`⚠️  Port ${this.port} is in use. Attempting to free it...`);
    const freed = await this.killPortProcess();
    
    if (freed) {
      return this.port;
    } else {
      console.log(`🔍 Finding alternative port...`);
      const alternativePort = await this.findAvailablePort(this.port + 1);
      console.log(`✅ Alternative port found: ${alternativePort}`);
      return alternativePort;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const port = parseInt(args[1]) || 8080;
  
  const manager = new PortManager(port);

  try {
    switch (command) {
      case 'check':
        const inUse = await manager.isPortInUse();
        console.log(`Port ${port} is ${inUse ? 'IN USE' : 'AVAILABLE'}`);
        if (inUse) {
          const processInfo = await manager.getPortProcess();
          if (processInfo) {
            console.log(`Process: ${processInfo.processName} (PID: ${processInfo.pid})`);
          }
        }
        break;

      case 'kill':
        await manager.killPortProcess();
        break;

      case 'find':
        const availablePort = await manager.findAvailablePort(port);
        console.log(`Available port: ${availablePort}`);
        break;

      case 'startup':
        const safePort = await manager.safeStartup();
        console.log(`Safe startup port: ${safePort}`);
        break;

      default:
        console.log(`
Port Manager for Agrinova API Server

Usage: node port-manager.js <command> [port]

Commands:
  check     Check if port is in use (default: 8080)
  kill      Kill process using the port
  find      Find next available port
  startup   Safe startup - kill conflicting process or find alternative port

Examples:
  node port-manager.js check 8080
  node port-manager.js kill 8080  
  node port-manager.js find 8080
  node port-manager.js startup 8080
        `);
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PortManager;
