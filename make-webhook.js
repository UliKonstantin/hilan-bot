const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Store pending confirmations
const pendingConfirmations = new Map();

// Helper function to find the most recent Excel file
function findLatestExcelFile() {
  const downloadsDir = path.join(__dirname, 'downloads');
  
  if (!fs.existsSync(downloadsDir)) {
    return null;
  }
  
  const files = fs.readdirSync(downloadsDir)
    .filter(file => file.endsWith('.xls') || file.endsWith('.xlsx'))
    .map(file => ({
      name: file,
      path: path.join(downloadsDir, file),
      stats: fs.statSync(path.join(downloadsDir, file))
    }))
    .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
  
  return files.length > 0 ? files[0] : null;
}

// Helper function to read Excel file as base64
function readExcelFileAsBase64(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return fileBuffer.toString('base64');
  } catch (error) {
    console.error('Error reading Excel file:', error);
    return null;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual trigger endpoint
app.post('/trigger', async (req, res) => {
  try {
    console.log('Manual trigger received');
    
    // Execute the Hilan bot
    const scriptPath = path.join(__dirname, 'index.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing script:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          stdout: stdout,
          stderr: stderr
        });
        return;
      }
      
      console.log('Script executed successfully');
      
      // Find the latest Excel file
      const latestExcel = findLatestExcelFile();
      let excelData = null;
      let excelFileName = null;
      
      if (latestExcel) {
        excelData = readExcelFileAsBase64(latestExcel.path);
        excelFileName = latestExcel.name;
        console.log('Found Excel file:', excelFileName);
      }
      
      res.json({ 
        success: true, 
        message: 'Hilan automation completed successfully',
        timestamp: new Date().toISOString(),
        output: stdout,
        excelFile: excelFileName,
        excelData: excelData,
        excelSize: latestExcel ? latestExcel.stats.size : null
      });
    });
  } catch (error) {
    console.error('Error in manual trigger:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Main webhook endpoint for Make
app.post('/webhook/hilan-automation', async (req, res) => {
  try {
    console.log('Received webhook from Make:', req.body);
    
    // Validate webhook (optional - add your own validation)
    const { trigger, timestamp, source, confirmationId } = req.body;
    
    // If this is a WhatsApp-triggered request, validate confirmation
    if (source === 'whatsapp' && confirmationId) {
      const pendingConfirmation = pendingConfirmations.get(confirmationId);
      if (!pendingConfirmation) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid confirmation ID' 
        });
      }
      pendingConfirmations.delete(confirmationId);
    }
    
    // Execute the Hilan bot
    const scriptPath = path.join(__dirname, 'index.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing script:', error);
        res.status(500).json({ 
          success: false, 
          error: error.message,
          stdout: stdout,
          stderr: stderr,
          source: 'direct'
        });
        return;
      }
      
      console.log('Script executed successfully');
      
      // Find the latest Excel file
      const latestExcel = findLatestExcelFile();
      let excelData = null;
      let excelFileName = null;
      
      if (latestExcel) {
        excelData = readExcelFileAsBase64(latestExcel.path);
        excelFileName = latestExcel.name;
        console.log('Found Excel file:', excelFileName);
      } else {
        console.log('No Excel file found in downloads directory');
      }
      
      res.json({ 
        success: true, 
        message: 'Hilan automation completed successfully',
        timestamp: new Date().toISOString(),
        output: stdout,
        excelFile: excelFileName,
        excelData: excelData,
        excelSize: latestExcel ? latestExcel.stats.size : null,
        source: 'direct'
      });
    });
  } catch (error) {
    console.error('Error in webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      source: 'direct'
    });
  }
});

// WhatsApp confirmation endpoint
app.post('/webhook/whatsapp-confirmation', async (req, res) => {
  try {
    const { confirmationId, response, phoneNumber } = req.body;
    
    console.log(`WhatsApp confirmation received: ${confirmationId} - ${response}`);
    
    if (!confirmationId || !response) {
      return res.status(400).json({
        success: false,
        error: 'Missing confirmationId or response'
      });
    }
    
    // Store the confirmation
    pendingConfirmations.set(confirmationId, {
      confirmed: response.toLowerCase().includes('yes'),
      response: response,
      phoneNumber: phoneNumber,
      timestamp: new Date().toISOString()
    });
    
    // Set expiration (30 minutes)
    setTimeout(() => {
      pendingConfirmations.delete(confirmationId);
    }, 30 * 60 * 1000);
    
    res.json({
      success: true,
      message: 'Confirmation stored',
      confirmed: response.toLowerCase().includes('yes'),
      confirmationId
    });
    
  } catch (error) {
    console.error('WhatsApp confirmation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get confirmation status
app.get('/confirmation/:id', (req, res) => {
  const confirmationId = req.params.id;
  const confirmation = pendingConfirmations.get(confirmationId);
  
  if (!confirmation) {
    return res.status(404).json({
      success: false,
      error: 'Confirmation not found or expired'
    });
  }
  
  res.json({
    success: true,
    confirmation: confirmation
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Manual trigger: http://localhost:${PORT}/trigger`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/hilan-automation`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 