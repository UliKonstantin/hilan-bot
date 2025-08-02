const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Store pending confirmations
const pendingConfirmations = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main webhook endpoint for Make
app.post('/webhook/hilan-automation', async (req, res) => {
  try {
    console.log('Received webhook from Make:', req.body);
    
    // Validate webhook (optional - add your own validation)
    const { trigger, timestamp, source, confirmationId } = req.body;
    
    // If this is a WhatsApp-triggered request, validate confirmation
    if (source === 'whatsapp' && confirmationId) {
      const confirmation = pendingConfirmations.get(confirmationId);
      if (!confirmation || !confirmation.confirmed) {
        return res.status(400).json({
          success: false,
          error: 'Confirmation not received or expired',
          confirmationId
        });
      }
    }
    
    // Execute the Hilan bot
    const scriptPath = path.join(__dirname, 'index.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing Hilan bot:', error);
        return res.status(500).json({
          success: false,
          error: error.message,
          stdout,
          stderr
        });
      }
      
      console.log('Hilan bot executed successfully');
      console.log('stdout:', stdout);
      if (stderr) console.log('stderr:', stderr);
      
      // Clean up confirmation if it was WhatsApp-triggered
      if (source === 'whatsapp' && confirmationId) {
        pendingConfirmations.delete(confirmationId);
      }
      
      res.json({
        success: true,
        message: 'Hilan automation completed successfully',
        timestamp: new Date().toISOString(),
        output: stdout,
        source: source || 'direct'
      });
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

// Manual trigger endpoint
app.post('/trigger', async (req, res) => {
  try {
    console.log('Manual trigger received');
    
    const scriptPath = path.join(__dirname, 'index.js');
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing Hilan bot:', error);
        return res.status(500).json({
          success: false,
          error: error.message,
          stdout,
          stderr
        });
      }
      
      console.log('Hilan bot executed successfully');
      res.json({
        success: true,
        message: 'Hilan automation completed successfully',
        timestamp: new Date().toISOString(),
        output: stdout
      });
    });
    
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Hilan automation webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/hilan-automation`);
  console.log(`WhatsApp confirmation: http://localhost:${PORT}/webhook/whatsapp-confirmation`);
  console.log(`Manual trigger: http://localhost:${PORT}/trigger`);
}); 