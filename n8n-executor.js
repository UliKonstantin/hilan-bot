const { spawn } = require('child_process');
const path = require('path');

class HilanAutomationExecutor {
  constructor() {
    this.scriptPath = path.join(__dirname, 'index.js');
  }

  async execute(options = {}) {
    return new Promise((resolve, reject) => {
      const { 
        timeout = 300000, // 5 minutes default
        logOutput = true,
        captureOutput = true 
      } = options;

      console.log('Starting Hilan automation...');
      
      const child = spawn('node', [this.scriptPath], {
        stdio: captureOutput ? 'pipe' : 'inherit',
        timeout: timeout
      });

      let stdout = '';
      let stderr = '';

      if (captureOutput) {
        child.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          if (logOutput) {
            console.log(output.trim());
          }
        });

        child.stderr.on('data', (data) => {
          const output = data.toString();
          stderr += output;
          if (logOutput) {
            console.error(output.trim());
          }
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          console.log('Hilan automation completed successfully');
          resolve({
            success: true,
            exitCode: code,
            stdout,
            stderr,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error(`Hilan automation failed with exit code ${code}`);
          reject({
            success: false,
            exitCode: code,
            stdout,
            stderr,
            timestamp: new Date().toISOString()
          });
        }
      });

      child.on('error', (error) => {
        console.error('Error executing Hilan automation:', error);
        reject({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

      child.on('timeout', () => {
        console.error('Hilan automation timed out');
        child.kill('SIGTERM');
        reject({
          success: false,
          error: 'Execution timed out',
          timestamp: new Date().toISOString()
        });
      });
    });
  }
}

// Export for use in other modules
module.exports = HilanAutomationExecutor;

// If run directly, execute the automation
if (require.main === module) {
  const executor = new HilanAutomationExecutor();
  
  executor.execute()
    .then(result => {
      console.log('Execution result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Execution failed:', error);
      process.exit(1);
    });
} 