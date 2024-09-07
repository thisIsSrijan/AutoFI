function waitForElement(selector, successCallback, failureCallback) {
  const maxRetries = 40;
  let retries = 0;
  const interval = setInterval(() => {
      try {
          const element = document.querySelector(selector);
          if (element) {
              clearInterval(interval);  //Stop if element is found
              successCallback(element);
          } else if (retries >= maxRetries) {
              clearInterval(interval);  //Stop after maxRetries
              failureCallback();
          }
          retries++;
      } catch (error) {
          console.log(`Error while waiting for element with selector "${selector}". Number of retries: ${retries} and error: `, error);
          clearInterval(interval);
      }
  }, 5); //Check every 5ms x 40 maxRetries = 200ms total
}

function closeTab() {
  chrome.runtime.sendMessage({ action: 'closeTab' });
}

//Main function to control the login process
function tryLoginProcess() {
  //it will check for 1 second for logout button, if not present then directly call login process
  waitForElement('#UserCheck_Logoff_Button_span', (logoutButton) => {
      // Case 1: Logout button is present, so logout first
      console.log('Logout button is present. Logging out...');
      logoutButton.click();
      // After logging out, check for regain access button or directly login
      checkForRegainAccessOrLogin();
  }, () => {
      // Case 2: Logout button not present, so check for regain access button
      console.log("logout button absent, checking regain access");
      checkForRegainAccessOrLogin();
  });
}

//Function to check for the regain access button or proceed directly to login
function checkForRegainAccessOrLogin() {
  waitForElement('span.portal_link', (regainAccessButton) => {
      console.log('Regain access button is present. Clicking it...');
      regainAccessButton.click();
      // After clicking regain access, check for login form and submit credentials
      tryLogin()
  }, () => {
      // Case 3: No regain access button, so directly check for the login form
      console.log("regain access absent. checking trylogin");
      tryLogin();
  });
}

function tryLogin() {
  try {
    chrome.storage.sync.get(['username', 'password'], (result) => {
      if (chrome.runtime.lastError) {
        console.log('Error retrieving credentials from Chrome storage:', chrome.runtime.lastError.message);
        return;
      }

      const username = result.username || '';
      const password = result.password || '';

      if (!username || !password) {
        console.log('Username or password is not set in Chrome storage.');
        return;
      }
      waitForElement('#LoginUserPassword_auth_username', (usernameField) => {
        waitForElement('#LoginUserPassword_auth_password', (passwordField) => {
            waitForElement('#UserCheck_Login_Button_span', (loginButton) => {
                try {
                  //auto form submisson
                  usernameField.value = username;
                  passwordField.value = password;
                  loginButton.click();
                  console.log("Login form details submited");

                  // const currentTime = new Date().now(); // Get current timestamp
                  chrome.storage.local.set({ lastLoginTime: Date.now()}, () => {
                    if (chrome.runtime.lastError){
                      console.log('Error setting lastLoginTime:', chrome.runtime.lastError.message);
                    }else{
                      console.log('Last login time set successfully:', Date.now());
                    }
                  });
                  setTimeout(()=>{closeTab()}, 400); //wait 0.4 seconds before closing
                  }catch(error){
                    console.log('Error during the login attempt:', error);
                  }
            });
        });
      });
    });
  }catch(error){
    console.log('Error during tryLogin execution:', error);
  }
}

//MESSAGE SENDER TO BACKGROUND JS
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'checkPasswordField') {
      // Check the presence of the password field
      const passwordField = document.getElementById('LoginUserPassword_auth_password');
      sendResponse({ passwordFieldExists: passwordField !== null });
    } else if (request.action === 'manualLogin') {
      tryLogin();  // Trigger login process manually
      sendResponse({ status: 'Login attempt triggered' });
    }
  } catch (error) {
    console.log('Error in onMessage listener:', error);
    sendResponse({ status: 'Error occurred', error: error.message });
  }
});

//initiate the login process
try {
  tryLoginProcess();
} catch (error) {
  console.log('Error starting the login attempt:', error);
}