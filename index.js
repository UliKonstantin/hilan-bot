require("dotenv").config();
const config = require("config");
const playwright = require("playwright");
var Promise = require("bluebird");

(async () => {
  for (const browserType of ["chromium"]) {
    const browser = await playwright[browserType].launch({
      headless: true,
      slowMo: 50,
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Debug: log config values
    console.log("Config loaded:", {
      username: config.hilan.username,
      password: config.hilan.password ? "***" : undefined,
      id: config.hilan.id,
      loginPage: config.hilan.pages.loginPage
    });
    
    await page.goto(config.hilan.pages.loginPage);
    await Promise.delay(1000); // Wait for page to load
    
    // Debug: Check page content
    console.log("Page title:", await page.title());
    const pageContent = await page.textContent('body');
    if (pageContent.includes('click here')) {
      console.log("Page contains 'click here' text");
    }
    
    // Check if "click here" link exists for new session and click it
    try {
      // Try multiple selectors to find the "click here" link
      let clickHereLink = null;
      
      // Method 1: Look for any link containing "click here"
      clickHereLink = await page.locator('a:has-text("click here")').first();
      if (await clickHereLink.isVisible()) {
        console.log("Found 'click here' link (method 1), starting new session...");
        await clickHereLink.click();
        await Promise.delay(2000);
      } else {
        // Method 2: Look for link with partial text
        clickHereLink = await page.locator('a').filter({ hasText: 'click here' }).first();
        if (await clickHereLink.isVisible()) {
          console.log("Found 'click here' link (method 2), starting new session...");
          await clickHereLink.click();
          await Promise.delay(2000);
        } else {
          // Method 3: Try any clickable element with "click here" text
          clickHereLink = await page.locator('[href*="logout"], [onclick], a').filter({ hasText: 'click here' }).first();
          if (await clickHereLink.isVisible()) {
            console.log("Found 'click here' link (method 3), starting new session...");
            await clickHereLink.click();
            await Promise.delay(2000);
          }
        }
      }
    } catch (error) {
      console.log("No 'click here' link found, proceeding with login...", error.message);
    }
    
    // Wait for login form to be ready
    await Promise.delay(2000);
    console.log("Current URL:", page.url());
    console.log("Looking for login form fields...");
    
    try {
      // Wait for form to load
      await page.waitForSelector('input', { timeout: 10000 });
      
      // Get all input fields and identify them
      const allInputs = await page.locator('input').all();
      console.log(`Found ${allInputs.length} total input fields`);
      
      let usernameField = null;
      let passwordField = null; 
      let idField = null;
      
      // Find fields by type and position
      const textInputs = await page.locator('input[type="text"]').all();
      const passwordInputs = await page.locator('input[type="password"]').all();
      
      console.log(`Text inputs: ${textInputs.length}, Password inputs: ${passwordInputs.length}`);
      
      // Debug: Log details about each field
      for (let i = 0; i < textInputs.length; i++) {
        const field = textInputs[i];
        const placeholder = await field.getAttribute('placeholder');
        const name = await field.getAttribute('name');
        const id = await field.getAttribute('id');
        console.log(`Text field ${i}: placeholder="${placeholder}" name="${name}" id="${id}"`);
      }
      
      // Assign fields (assuming order: username, password, id)
      if (textInputs.length >= 2) {
        usernameField = textInputs[0];  // First text field = username
        idField = textInputs[1];        // Second text field = ID
      }
      if (passwordInputs.length >= 1) {
        passwordField = passwordInputs[0]; // Password field
      }
      
      // Fill the fields with detailed logging
      if (usernameField) {
        console.log("Filling username field...");
        try {
          await usernameField.fill(config.hilan.username);
          console.log("Username filled successfully");
        } catch (error) {
          console.log("Error filling username:", error.message);
        }
      }
      
      if (passwordField) {
        console.log("Filling password field...");
        try {
          await passwordField.fill(config.hilan.password);
          console.log("Password filled successfully");
        } catch (error) {
          console.log("Error filling password:", error.message);
        }
      }
      
      if (idField) {
        console.log("Filling ID field...");
        console.log("ID value to fill:", config.hilan.id);
        try {
          await idField.fill(config.hilan.id);
          console.log("ID filled successfully");
          
          // Verify it was filled
          const filledValue = await idField.inputValue();
          console.log("ID field now contains:", filledValue);
        } catch (error) {
          console.log("Error filling ID:", error.message);
        }
      } else {
        console.log("ID field not found!");
      }
      
      if (usernameField && passwordField && idField) {
        // Click login button
        console.log("Clicking login button...");
        await page.click('input[type="submit"], button, input[value="Logon"]');
      } else {
        console.log("Missing some required fields");
      }
      
    } catch (error) {
      console.log("Error with login form:", error.message);
      console.log("Available form fields:");
      const inputs = await page.locator('input').all();
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');
        console.log(`Input ${i}: id="${id}" name="${name}" type="${type}"`);
      }
    }

    // const frames = await page.frames();
    // const newframe = frames[1];
    // const newframehandle = newframe.contentFrame();
    // await newframehandle.click('css=input:text("שמור וסגור")');

    // Wait for dashboard to load after login
    console.log("Waiting for dashboard to load...");
    await Promise.delay(3000);
    
    try {
      // Debug: Check what's on the page after login
      console.log("Current URL after login:", page.url());
      console.log("Page title:", await page.title());
      
      // Look for any buttons or links that might lead to timesheet
      const allButtons = await page.locator('button, a, [role="button"]').all();
      console.log(`Found ${allButtons.length} clickable elements`);
      
      // Log text of clickable elements to find the right one
      for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
        const text = await allButtons[i].textContent();
        if (text && text.trim()) {
          console.log(`Button ${i}: "${text.trim()}"`);
        }
      }
      
      // Step 1: Click "דיווח ועדכון" (Report and Update)
      console.log("Looking for דיווח ועדכון button...");
      
      // Find the button by text content from our buttons array
      let reportButton = null;
      for (let i = 0; i < allButtons.length; i++) {
        const text = await allButtons[i].textContent();
        console.log(`Button ${i} text: "${text}" (trimmed: "${text?.trim()}")`);
        if (text && text.trim() === "דיווח ועדכון") {
          console.log(`✅ Found דיווח ועדכון button at index ${i}`);
          reportButton = allButtons[i];
          break;
        }
      }
      
      console.log(`Report button found: ${reportButton ? 'YES' : 'NO'}`);
      
      if (reportButton) {
        console.log("Found דיווח ועדכון button, clicking...");
        try {
          // Use dispatchEvent as primary method (works better with dropdown items)
          await reportButton.dispatchEvent('click');
          console.log("✅ Click completed successfully");
          
          // Wait for page navigation to complete
          console.log("Waiting for page navigation...");
          await Promise.delay(3000);
          
          // Check if we navigated to a new page
          const newUrl = page.url();
          console.log("Current URL after navigation:", newUrl);
          
          // If we're on a new page, wait for it to load and continue
          if (newUrl !== config.hilan.pages.loginPage) {
            console.log("✅ Successfully navigated to timesheet page");
            
            // Wait for the new page to fully load
            await Promise.delay(2000);
            
            // Continue with the workflow on the new page
            console.log("Page title after navigation:", await page.title());
            
          } else {
            console.log("Still on same page, continuing...");
          }
          
        } catch (clickError) {
          console.log("❌ Error during dispatchEvent click:", clickError.message);
          
          // Try regular click as fallback
          console.log("Trying regular click as fallback...");
          try {
            await reportButton.click();
            console.log("✅ Regular click completed");
            await Promise.delay(3000);
          } catch (regularClickError) {
            console.log("❌ Regular click also failed:", regularClickError.message);
          }
        }
        
        await Promise.delay(2000);
        
        // NEW: Navigate back one month since it opens next month by default
        console.log("Looking for previous month button...");
        try {
          // Try different selectors for previous month button
          const prevMonthSelectors = [
            'text="הקודם"',      // Previous
            'text="חזרה"',      // Back  
            'text="<"',         // Left arrow
            'text="<<"',        // Double left arrow
            'button:has-text("הקודם")',
            'button:has-text("<")',
            'a:has-text("הקודם")',
            'a:has-text("<")',
            '[title*="הקודם"]',
            '[title*="previous"]',
            '.prev-month',
            '.previous',
            '[onclick*="prev"]',
            '[onclick*="הקודם"]'
          ];
          
          let prevButton = null;
          for (const selector of prevMonthSelectors) {
            try {
              const button = await page.locator(selector).first();
              if (await button.isVisible()) {
                console.log(`Found previous month button with selector: ${selector}`);
                prevButton = button;
                break;
              }
            } catch (e) {
              // Continue to next selector
            }
          }
          
          if (prevButton) {
            console.log("Clicking previous month button...");
            await prevButton.dispatchEvent('click');
            await Promise.delay(2000);
            console.log("✅ Navigated to previous month");
          } else {
            console.log("❌ Previous month button not found, trying to find navigation elements...");
            
            // Debug: Look for any navigation elements
            const navElements = await page.locator('button, a, [onclick]').all();
            console.log(`Found ${navElements.length} potential navigation elements`);
            
            for (let i = 0; i < Math.min(navElements.length, 15); i++) {
              const text = await navElements[i].textContent();
              const onclick = await navElements[i].getAttribute('onclick');
              const title = await navElements[i].getAttribute('title');
              if (text || onclick || title) {
                console.log(`Nav element ${i}: text="${text}" onclick="${onclick?.substring(0, 30)}" title="${title}"`);
              }
            }
          }
          
        } catch (monthNavError) {
          console.log("Error navigating to previous month:", monthNavError.message);
        }
        
      await Promise.delay(1000);
        
        // Step 2: Select all days as "ימים נבחרים" (Selected Days)
        console.log("Looking for days to select...");
        
        // Find all day elements in the calendar
        const dayElements = await page.locator('td').filter({ hasText: /^\d{1,2}$/ }).all();
        console.log(`Found ${dayElements.length} potential day elements`);
        
        // Get current date to determine which month we're in
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        let currentMonth = currentDate.getMonth(); // 0-based (January = 0)
        
        // IMPORTANT: We navigated back one month, so adjust the calculation
        currentMonth = currentMonth - 1;
        let yearForCalculation = currentYear;
        
        // Handle year boundary (if current month is January, previous month is December of last year)
        if (currentMonth < 0) {
          currentMonth = 11; // December
          yearForCalculation = currentYear - 1;
        }
        
        console.log(`Processing calendar for ${yearForCalculation}-${currentMonth + 1} (navigated back from current month)`);
        
        // First pass: Unmark any pre-selected weekend days
        console.log("First pass: Checking for pre-selected weekend days to unmark...");
        for (let i = 0; i < dayElements.length; i++) {
          try {
            const dayText = await dayElements[i].textContent();
            if (dayText && /^\d{1,2}$/.test(dayText.trim())) {
              const dayNumber = parseInt(dayText.trim());
              
              // Calculate what day of the week this date falls on (using PREVIOUS month)
              const dateToCheck = new Date(yearForCalculation, currentMonth, dayNumber);
              const dayOfWeek = dateToCheck.getDay(); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
              
              // If it's a weekend day (Friday=5 or Saturday=6), check if it's selected and unmark it
              if (dayOfWeek === 5 || dayOfWeek === 6) {
                // Check if this day appears to be selected (different styling, etc.)
                const isSelected = await dayElements[i].evaluate(el => {
                  return el.classList.contains('selected') || 
                         el.classList.contains('active') ||
                         el.style.backgroundColor ||
                         el.querySelector('.selected') !== null ||
                         getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)';
                });
                
                if (isSelected) {
                  console.log(`Unmarking pre-selected weekend day ${dayNumber} (day of week: ${dayOfWeek})`);
                  await dayElements[i].click(); // Click to unselect
                  await Promise.delay(200);
                } else {
                  console.log(`Weekend day ${dayNumber} not pre-selected, skipping`);
                }
              }
            }
          } catch (dayError) {
            console.log(`Error checking day ${i}:`, dayError.message);
          }
        }
        
        await Promise.delay(500);
        
        // Second pass: Select only workdays (Sunday-Thursday)
        console.log("Second pass: Selecting workdays...");
        for (let i = 0; i < dayElements.length; i++) {
          try {
            const dayText = await dayElements[i].textContent();
            if (dayText && /^\d{1,2}$/.test(dayText.trim())) {
              const dayNumber = parseInt(dayText.trim());
              
              // Calculate what day of the week this date falls on (using PREVIOUS month)
              const dateToCheck = new Date(yearForCalculation, currentMonth, dayNumber);
              const dayOfWeek = dateToCheck.getDay(); // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
              
              // Only select workdays (Sunday=0 through Thursday=4)
              if (dayOfWeek >= 0 && dayOfWeek <= 4) {
                console.log(`Selecting workday ${dayNumber} (day of week: ${dayOfWeek})`);
                await dayElements[i].click();
                await Promise.delay(200); // Small delay between clicks
              }
            }
          } catch (dayError) {
            console.log(`Error selecting day ${i}:`, dayError.message);
          }
        }
        
      await Promise.delay(1000);
        
        // Step 2.5: Click "ימים נבחרים" button after selecting days
        console.log("Looking for ימים נבחרים button...");
        try {
          const selectedDaysButton = await page.locator('text="ימים נבחרים"').first();
          if (await selectedDaysButton.isVisible()) {
            console.log("Found ימים נבחרים button, clicking...");
            await selectedDaysButton.dispatchEvent('click');
            console.log("✅ Clicked ימים נבחרים button");
            await Promise.delay(2000);
          } else {
            console.log("ימים נבחרים button not visible, trying alternative selectors...");
            // Try finding by different selectors
            const altButtons = await page.locator('button, a, input[type="button"]').all();
            for (const btn of altButtons) {
              const btnText = await btn.textContent();
              if (btnText && btnText.includes('ימים נבחרים')) {
                console.log("Found ימים נבחרים with alternative selector");
                await btn.dispatchEvent('click');
                await Promise.delay(2000);
                break;
              }
            }
          }
        } catch (buttonError) {
          console.log("Error clicking ימים נבחרים button:", buttonError.message);
        }
        
        // Step 3: Report hours for each selected day
        console.log("Filling working hours...");
        
        // Wait for the timesheet form to load
        await Promise.delay(2000);
        
        // Debug: Check what happened after clicking ימים נבחרים
        console.log("Current URL after ימים נבחרים:", page.url());
        console.log("Page title after ימים נבחרים:", await page.title());
        
        // Take a screenshot to see what we're working with
        await page.screenshot({ path: 'debug-after-navigation.png' });
        console.log("Screenshot saved as debug-after-navigation.png");
        
        // Find timesheet rows more specifically - after clicking ימים נבחרים the structure might be different
        console.log("Looking for timesheet table rows...");
        
        // First, let's see what's actually on the page
        const allTables = await page.locator('table').all();
        console.log(`Found ${allTables.length} tables on the page`);
        
        const allRows = await page.locator('tr').all();
        console.log(`Found ${allRows.length} total rows on the page`);
        
        const allInputs = await page.locator('input').all();
        console.log(`Found ${allInputs.length} total inputs on the page`);
        
        const allSelects = await page.locator('select').all();
        console.log(`Found ${allSelects.length} total selects on the page`);
        
        // Target the specific timesheet table based on the HTML structure
        let timesheetRows = [];
        
        try {
          // Method 1: Look for the specific timesheet table with class HReportsGrid
          const timesheetTable = await page.locator('table.HReportsGrid').first();
          if (await timesheetTable.isVisible()) {
            console.log("✅ Found HReportsGrid table");
            
            // Get rows from the inner body table
            timesheetRows = await timesheetTable.locator('#ctl00_mp_RG_Days_5610313354748_2025_08_reportsGrid_innerBody tr').all();
            console.log(`Method 1: Found ${timesheetRows.length} rows in HReportsGrid table`);
          }
          
          // If that didn't work, try method 2: Look for rows with the specific pattern
          if (timesheetRows.length === 0) {
            timesheetRows = await page.locator('tr[id*="ctl00_mp_RG_Days"][id*="row_"]').all();
            console.log(`Method 2: Found ${timesheetRows.length} rows with timesheet pattern`);
          }
          
          // If still no rows, try method 3: Look for rows with manual entry inputs
          if (timesheetRows.length === 0) {
            timesheetRows = await page.locator('tr:has(input[id*="ManualEntry"])').all();
            console.log(`Method 3: Found ${timesheetRows.length} rows with ManualEntry inputs`);
          }
          
        } catch (rowError) {
          console.log("Error finding timesheet rows:", rowError.message);
        }
        
        console.log(`Final: Found ${timesheetRows.length} timesheet rows to fill`);
        
        // Debug: Check the first few rows to understand structure
        for (let i = 0; i < Math.min(timesheetRows.length, 5); i++) {
          try {
            const row = timesheetRows[i];
            const inputs = await row.locator('input[type="text"], input:not([type])').all();
            const selects = await row.locator('select').all();
            const text = await row.textContent();
            console.log(`Row ${i + 1}: ${inputs.length} inputs, ${selects.length} selects, text: "${text?.substring(0, 100)}"`);
          } catch (debugError) {
            console.log(`Error debugging row ${i + 1}:`, debugError.message);
          }
        }
        
        // Additional debugging: Check if we're getting the right rows
        if (timesheetRows.length <= 1) {
          console.log("⚠️ WARNING: Only found 1 or fewer rows. Trying alternative detection...");
          
          // Try a more aggressive approach
          const allRows = await page.locator('tr').all();
          console.log(`Total rows on page: ${allRows.length}`);
          
          const rowsWithInputs = await page.locator('tr:has(input)').all();
          console.log(`Rows with any inputs: ${rowsWithInputs.length}`);
          
          const rowsWithTextInputs = await page.locator('tr:has(input[type="text"])').all();
          console.log(`Rows with text inputs: ${rowsWithTextInputs.length}`);
          
          // If we found more rows with inputs, use those
          if (rowsWithTextInputs.length > timesheetRows.length) {
            console.log(`Using alternative detection: ${rowsWithTextInputs.length} rows with text inputs`);
            timesheetRows = rowsWithTextInputs;
          }
        }
        
        // Limit to reasonable number of rows (max 31 days in month)
        const maxRows = timesheetRows.length; // Process all rows
        console.log(`Processing ${maxRows} rows (ALL ROWS)`);
        
        // Fill each row with the required data
        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
          console.log(`Filling row ${rowIndex + 1}/${maxRows}`);
          
          try {
            const row = timesheetRows[rowIndex];
            
            // Find the specific time input fields in this row
            const entryInput = await row.locator('input[id*="ManualEntry"]').first();
            const exitInput = await row.locator('input[id*="ManualExit"]').first();
            
            console.log(`Row ${rowIndex + 1}: Entry input found: ${await entryInput.isVisible()}, Exit input found: ${await exitInput.isVisible()}`);
            
            // Skip rows that don't have the right structure for timesheet data
            if (!await entryInput.isVisible() || !await exitInput.isVisible()) {
              console.log(`⚠️ Skipping row ${rowIndex + 1} - missing time inputs`);
              continue;
            }
            
            // Check if this row has dropdowns (required for timesheet)
            const dropdownsInRow = await row.locator('select').all();
            if (dropdownsInRow.length < 2) {
              console.log(`⚠️ Skipping row ${rowIndex + 1} - not enough dropdowns (${dropdownsInRow.length})`);
              continue;
            }
            
            console.log(`✅ Processing row ${rowIndex + 1} - 2 time inputs, ${dropdownsInRow.length} dropdowns`);
            
            // 1. Fill כניסה (Entry time) with 0900
            try {
              console.log(`Filling entry time (0900) in row ${rowIndex + 1}`);
              
              // Use the same successful approach as exit time
              let entryFilled = false;
              
              // Method 1: Simple select all and type digits (same as working exit time method)
              try {
                await entryInput.click();
                await Promise.delay(100);
                await entryInput.press('Control+a');
                await Promise.delay(50);
                await entryInput.press('Backspace');
                await Promise.delay(50);
                
                // Type: 0, 9, 0, 0 (same timing as exit time)
                await entryInput.type('0');
                await Promise.delay(50);
                await entryInput.type('9');
                await Promise.delay(50);
                await entryInput.type('0');
                await Promise.delay(50);
                await entryInput.type('0');
                
                console.log(`✅ Entry time filled (method 1) in row ${rowIndex + 1}`);
                entryFilled = true;
              } catch (method1Error) {
                console.log(`Entry method 1 failed for row ${rowIndex + 1}:`, method1Error.message);
              }
              
              // Method 2: Direct fill as fallback
              if (!entryFilled) {
                try {
                  await entryInput.fill('0900', { timeout: 3000 });
                  console.log(`✅ Entry time filled (method 2) in row ${rowIndex + 1}`);
                  entryFilled = true;
                } catch (method2Error) {
                  console.log(`Entry method 2 failed for row ${rowIndex + 1}:`, method2Error.message);
                }
              }
              
              if (!entryFilled) {
                console.log(`❌ All entry time methods failed for row ${rowIndex + 1}`);
              }
              
              await Promise.delay(300);
            } catch (entryError) {
              console.log(`❌ Error filling entry time in row ${rowIndex + 1}:`, entryError.message);
            }
            
            // 2. Fill יציאה (Exit time) with 17:30
            try {
              console.log(`Filling exit time (17:30) in row ${rowIndex + 1}`);
              
              // Use the exact same successful approach as entry time
              let exitFilled = false;
              
              // Method 1: Simple select all and type digits (same as working entry time method)
              try {
                await exitInput.click();
                await Promise.delay(100);
                await exitInput.press('Control+a');
                await Promise.delay(50);
                await exitInput.press('Backspace');
                await Promise.delay(50);
                
                // Type: 1, 7, 3, 0 (same timing as entry time)
                await exitInput.type('1');
                await Promise.delay(50);
                await exitInput.type('7');
                await Promise.delay(50);
                await exitInput.type('3');
                await Promise.delay(50);
                await exitInput.type('0');
                
                console.log(`✅ Exit time filled (method 1) in row ${rowIndex + 1}`);
                exitFilled = true;
              } catch (method1Error) {
                console.log(`Exit method 1 failed for row ${rowIndex + 1}:`, method1Error.message);
              }
              
              // Method 2: Direct fill as fallback
              if (!exitFilled) {
                try {
                  await exitInput.fill('1730', { timeout: 3000 });
                  console.log(`✅ Exit time filled (method 2) in row ${rowIndex + 1}`);
                  exitFilled = true;
                } catch (method2Error) {
                  console.log(`Exit method 2 failed for row ${rowIndex + 1}:`, method2Error.message);
                }
              }
              
              if (!exitFilled) {
                console.log(`❌ All exit time methods failed for row ${rowIndex + 1}`);
              }
              
              await Promise.delay(300);
            } catch (exitError) {
              console.log(`❌ Error filling exit time in row ${rowIndex + 1}:`, exitError.message);
            }
            
            // 3. Fill הערות (Comments) dropdown with "לא מותקן שעון נוכחות"
            try {
              const commentDropdowns = await row.locator('select').all();
              console.log(`Found ${commentDropdowns.length} dropdowns in row ${rowIndex + 1}`);
              
              // We need to identify and fill multiple single-select dropdowns:
              // 1. נושא (single select) -> נוכחות
              // 2. סוג דיווח (single select) -> עבודה  
              // 3. הערות (single select) -> לא מותקן שעון נוכחות
              
              for (let dropdownIndex = 0; dropdownIndex < commentDropdowns.length; dropdownIndex++) {
                try {
                  const dropdown = commentDropdowns[dropdownIndex];
                  const options = await dropdown.locator('option').allTextContents();
                  console.log(`Dropdown ${dropdownIndex} options:`, options);
                  
                  // Check if this is נושא dropdown - select נוכחות (single selection)
                  let dropdownHandled = false;
                  for (let i = 0; i < options.length; i++) {
                    if (options[i].includes('נוכחות')) {
                      await dropdown.selectOption({ index: i });
                      console.log(`✅ Selected נוכחות in נושא dropdown (row ${rowIndex + 1})`);
                      dropdownHandled = true;
                      break; // Single select - stop after first match
                    }
                  }
                  
                  // Check if this is סוג דיווח dropdown - select עבודה (single selection)
                  if (!dropdownHandled) {
                    for (let i = 0; i < options.length; i++) {
                      if (options[i].includes('עבודה')) {
                        await dropdown.selectOption({ index: i });
                        console.log(`✅ Selected עבודה in סוג דיווח dropdown (row ${rowIndex + 1})`);
                        dropdownHandled = true;
                        break; // Single select - stop after first match
                      }
                    }
                  }
                  
                  // Check if this is הערות dropdown - select לא מותקן שעון נוכחות (single selection)
                  if (!dropdownHandled) {
                    for (let i = 0; i < options.length; i++) {
                      if (options[i].includes('לא מותקן') || options[i].includes('שעון נוכחות')) {
                        await dropdown.selectOption({ index: i });
                        console.log(`✅ Selected comment option in row ${rowIndex + 1}`);
                        dropdownHandled = true;
                        break; // Single select - stop after first match
                      }
                    }
                  }
                  
                  // Fallback for unrecognized dropdowns (single selection)
                  if (!dropdownHandled && options.length > 1) {
                    await dropdown.selectOption({ index: 1 });
                    console.log(`✅ Selected fallback option (index 1) in row ${rowIndex + 1}`);
                  }
                  
                  await Promise.delay(200);
                  
                } catch (dropdownError) {
                  console.log(`❌ Error with dropdown ${dropdownIndex} in row ${rowIndex + 1}:`, dropdownError.message);
                }
              }
            } catch (dropdownError) {
              console.log(`❌ Error finding dropdowns in row ${rowIndex + 1}:`, dropdownError.message);
            }
            
            await Promise.delay(500); // Delay between rows
            
          } catch (rowError) {
            console.log(`❌ Error processing row ${rowIndex + 1}:`, rowError.message);
            continue;
          }
        }
        
        // Look for save/submit button
        console.log("Looking for save button...");
        
        // Debug: Check what buttons/links are available
        console.log("Debugging available buttons...");
        const allButtons = await page.locator('button, input[type="submit"], input[type="button"], a').all();
        console.log(`Found ${allButtons.length} clickable elements`);
        
        // Log text of potential save buttons
        for (let i = 0; i < Math.min(allButtons.length, 30); i++) {
          const text = await allButtons[i].textContent();
          const value = await allButtons[i].getAttribute('value');
          const onclick = await allButtons[i].getAttribute('onclick');
          if (text || value) {
            console.log(`Button ${i}: text="${text}" value="${value}" onclick="${onclick?.substring(0, 50)}"`);
          }
        }
        
        // Try multiple save button selectors
        const saveSelectors = [
          'text="שמור"',
          'text="עדכן"', 
          'text="אישור"',
          'text="שלח"',
          'text="סגור"',
          'text="שמירה"',  // NEW: Added שמירה
          'input[value*="שמור"]',
          'input[value*="עדכן"]',
          'input[value*="אישור"]',
          'input[value*="שלח"]',
          'input[value*="שמירה"]',  // NEW: Added שמירה value
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("save")',
          'button:has-text("submit")',
          'a:has-text("שמור")',
          'a:has-text("עדכן")',
          'a:has-text("שמירה")',  // NEW: Added שמירה link
          '[onclick*="save"]',
          '[onclick*="submit"]',
          '[onclick*="שמור"]',
          '[onclick*="שמירה"]'  // NEW: Added שמירה onclick
        ];
        
        let saveButton = null;
        
        for (const selector of saveSelectors) {
          try {
            const button = await page.locator(selector).first();
            if (await button.isVisible()) {
              console.log(`Found save button with selector: ${selector}`);
              saveButton = button;
              break;
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        if (saveButton) {
          try {
            console.log("Found save button, clicking...");
            await saveButton.dispatchEvent('click');
            await Promise.delay(2000);
            console.log("✅ Timesheet submitted!");
            
            // POST-SAVE WORKFLOW: Navigate to גליון מנותח, then ריכוז דיווחים and export Excel
            console.log("Starting post-save workflow...");
            
            // Step 1: Navigate to גליון מנותח (Analyzed Sheet)
            console.log("Looking for גליון מנותח button...");
            try {
              // Wait for page to load after save
              await Promise.delay(3000);
              
              // Look for גליון מנותח button
              const analyzedSheetSelectors = [
                'text="גליון מנותח"',
                'button:has-text("גליון מנותח")',
                'a:has-text("גליון מנותח")',
                '[title*="גליון מנותח"]',
                '[onclick*="גליון מנותח"]'
              ];
              
              let analyzedSheetButton = null;
              for (const selector of analyzedSheetSelectors) {
                try {
                  const button = await page.locator(selector).first();
                  if (await button.isVisible()) {
                    console.log(`Found גליון מנותח button with selector: ${selector}`);
                    analyzedSheetButton = button;
                    break;
                  }
                } catch (e) {
                  // Continue to next selector
                }
              }
              
              if (analyzedSheetButton) {
                console.log("Clicking גליון מנותח button...");
                await analyzedSheetButton.dispatchEvent('click');
                await Promise.delay(3000);
                console.log("✅ Navigated to גליון מנותח page");
                
                // Debug: Check what's on the גליון מנותח page
                console.log("Current URL on גליון מנותח page:", page.url());
                console.log("Page title on גליון מנותח page:", await page.title());
                
                // Take a screenshot to see the page
                await page.screenshot({ path: 'debug-gilion-munatach.png' });
                console.log("Screenshot saved as debug-gilion-munatach.png");
                
                // Step 2: Navigate to ריכוז דיווחים from גליון מנותח page
                console.log("Looking for ריכוז דיווחים link on גליון מנותח page...");
                const reportSummarySelectors = [
                  'a:has-text("ריכוז דיווחים")',
                  'a[href*="AttendanceApproval.aspx"]',
                  'a.footer-links:has-text("ריכוז דיווחים")',
                  'text="ריכוז דיווחים"',
                  'button:has-text("ריכוז דיווחים")',
                  '[title*="ריכוז דיווחים"]',
                  '[onclick*="ריכוז דיווחים"]'
                ];
                
                let reportSummaryLink = null;
                for (const selector of reportSummarySelectors) {
                  try {
                    const link = await page.locator(selector).first();
                    if (await link.isVisible()) {
                      console.log(`Found ריכוז דיווחים link with selector: ${selector}`);
                      reportSummaryLink = link;
                      break;
                    }
                  } catch (e) {
                    // Continue to next selector
                  }
                }
                
                if (reportSummaryLink) {
                  console.log("Clicking ריכוז דיווחים link...");
                  await reportSummaryLink.dispatchEvent('click');
                  await Promise.delay(3000);
                  console.log("✅ Navigated to ריכוז דיווחים page");
                  
                  // Debug: Check what's on the ריכוז דיווחים page
                  console.log("Current URL on ריכוז דיווחים page:", page.url());
                  console.log("Page title on ריכוז דיווחים page:", await page.title());
                  
                  // Take a screenshot to see the page
                  await page.screenshot({ path: 'debug-rikuz-diyurim.png' });
                  console.log("Screenshot saved as debug-rikuz-diyurim.png");
                  
                  // Step 3: Look for the Excel export link
                  console.log("Looking for Excel export link...");
                  const excelLink = await page.locator('a#ctl00_mp_Strip_helpExcel').first();
                  
                  if (await excelLink.isVisible()) {
                    console.log("✅ Found Excel export link");
                    
                    // Set up download event listener before clicking
                    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
                    
                    console.log("Clicking Excel export link...");
                    await excelLink.dispatchEvent('click');
                    await Promise.delay(3000);
                    console.log("✅ Clicked Excel export link");
                    
                    try {
                      // Wait for download to start
                      const download = await downloadPromise;
                      console.log("✅ Excel download started:", download.suggestedFilename());
                      
                      // Save the file
                      const downloadPath = `./downloads/${download.suggestedFilename()}`;
                      await download.saveAs(downloadPath);
                      console.log("✅ Excel file saved to:", downloadPath);
                      
                    } catch (downloadError) {
                      console.log("No download event detected, checking for Save As dialog...");
                      
                      // Wait a bit for the Save As dialog to appear
                      await Promise.delay(2000);
                      
                      // Try to find and click the Save button in the Save As dialog
                      try {
                        // Look for Save button by text (macOS)
                        const saveButton = await page.locator('button:has-text("Save")').first();
                        if (await saveButton.isVisible()) {
                          console.log("✅ Found Save button in dialog, clicking...");
                          await saveButton.click();
                          await Promise.delay(2000);
                          console.log("✅ Clicked Save button in dialog");
                        } else {
                          // Try alternative selectors for Save button
                          const saveSelectors = [
                            'button[type="submit"]',
                            'input[type="submit"]',
                            'button:has-text("שמור")',
                            'button:has-text("OK")',
                            'button:has-text("Confirm")'
                          ];
                          
                          for (const selector of saveSelectors) {
                            try {
                              const button = await page.locator(selector).first();
                              if (await button.isVisible()) {
                                console.log(`✅ Found Save button with selector: ${selector}`);
                                await button.click();
      await Promise.delay(2000);
                                console.log("✅ Clicked Save button");
                                break;
                              }
                            } catch (e) {
                              // Continue to next selector
                            }
                          }
                        }
                      } catch (dialogError) {
                        console.log("No Save As dialog found, checking if Excel opened in new tab...");
                        
                        // Check if a new page/tab opened
                        const pages = await context.pages();
                        if (pages.length > 1) {
                          console.log(`Found ${pages.length} pages, Excel might have opened in new tab`);
                          
                          // Switch to the new page
                          const newPage = pages[pages.length - 1];
                          await newPage.bringToFront();
                          console.log("Switched to new page:", newPage.url());
                          
                          // Take screenshot of the Excel page
                          await newPage.screenshot({ path: 'debug-excel-opened.png' });
                          console.log("Screenshot of opened Excel saved as debug-excel-opened.png");
                          
                          // Close the Excel page
                          await newPage.close();
                          console.log("✅ Closed Excel page");
                        } else {
                          console.log("No new page opened, Excel might have opened in same page");
                        }
                      }
                    }
                  } else {
                    console.log("❌ Excel export link not found");
                    
                    // Debug: List all links to see what's available
                    const allLinks = await page.locator('a').all();
                    console.log(`Found ${allLinks.length} total links on the page`);
                    
                    for (let j = 0; j < Math.min(allLinks.length, 20); j++) {
                      const linkText = await allLinks[j].textContent();
                      const linkId = await allLinks[j].getAttribute('id');
                      const linkTitle = await allLinks[j].getAttribute('title');
                      if (linkText || linkId || linkTitle) {
                        console.log(`Link ${j}: text="${linkText}" id="${linkId}" title="${linkTitle}"`);
                      }
                    }
                  }
                } else {
                  console.log("❌ ריכוז דיווחים link not found");
                  
                  // Debug: List all links to see what's available
                  const allLinks = await page.locator('a').all();
                  console.log(`Found ${allLinks.length} total links on גליון מנותח page`);
                  
                  for (let j = 0; j < Math.min(allLinks.length, 20); j++) {
                    const linkText = await allLinks[j].textContent();
                    const linkHref = await allLinks[j].getAttribute('href');
                    const linkClass = await allLinks[j].getAttribute('class');
                    if (linkText && linkText.trim()) {
                      console.log(`Link ${j}: text="${linkText}" href="${linkHref}" class="${linkClass}"`);
                    }
                  }
                }
              } else {
                console.log("❌ גליון מנותח button not found");
              }
            } catch (postSaveError) {
              console.log("Error in post-save workflow:", postSaveError.message);
            }
            
          } catch (clickError) {
            console.log("❌ Error clicking save button:", clickError.message);
            
            // Try regular click as fallback
            try {
              await saveButton.click();
              console.log("✅ Timesheet submitted with regular click!");
            } catch (regularClickError) {
              console.log("❌ Regular click also failed:", regularClickError.message);
            }
          }
        } else {
          console.log("❌ No save button found with any selector");
          
          // Try to find any button that might be a save button by text content
          console.log("Searching all buttons for save-like text...");
          for (let i = 0; i < allButtons.length; i++) {
            const text = await allButtons[i].textContent();
            const value = await allButtons[i].getAttribute('value');
            
            if (text && (text.includes('שמור') || text.includes('עדכן') || text.includes('אישור') || text.includes('שלח'))) {
              console.log(`Found potential save button by text: "${text}"`);
              try {
                await allButtons[i].dispatchEvent('click');
                console.log("✅ Clicked potential save button!");
                break;
              } catch (e) {
                console.log(`Failed to click button: ${e.message}`);
              }
            }
            
            if (value && (value.includes('שמור') || value.includes('עדכן') || value.includes('אישור') || value.includes('שלח'))) {
              console.log(`Found potential save button by value: "${value}"`);
              try {
                await allButtons[i].dispatchEvent('click');
                console.log("✅ Clicked potential save button!");
                break;
              } catch (e) {
                console.log(`Failed to click button: ${e.message}`);
              }
            }
          }
        }
        
      } else {
        console.log("דיווח ועדכון button not found");
      }
      
    } catch (error) {
      console.log("Error in timesheet automation:", error.message);
    }

    // await frame.fill(
    //   "css=tr.gridRowStyle >> css=td.ItemCell:first-child >> css=input",
    //   "0900"
    // );
    console.log("went to page");
    await page.screenshot({ path: `example-${browserType}.png` });
    await browser.close();
  }
})();