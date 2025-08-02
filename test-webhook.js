require("dotenv").config();
const config = require("config");
const axios = require('axios');

async function testWebhook() {
  try {
    console.log('Testing webhook...');
    
    const response = await axios.post('https://hilan-bot.onrender.com/webhook/hilan-automation', {
      trigger: 'test',
      timestamp: new Date().toISOString()
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.excelFile) {
      console.log('✅ Excel file found:', response.data.excelFile);
      console.log('Excel file size:', response.data.excelSize, 'bytes');
      console.log('Excel data available:', response.data.excelData ? 'Yes' : 'No');
    } else {
      console.log('❌ No Excel file found in response');
    }
    
  } catch (error) {
    console.error('Error testing webhook:', error.response?.data || error.message);
  }
}

testWebhook(); 