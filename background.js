const CLOSE_TAB_DELAY_MS = 10000; //timeout condition
const LOGIN_INTERVAL_HOURS = 3.9;
const LOGIN_INTERVAL_MINUTES = 239;
const IS_CREDENTIALS_UPDATED_KEY = 'isCredentialsUpdated';
const AUTO_LOGIN_ENABLED_KEY = 'autoLoginEnabled';
const UNIVERSITY_URL = 'https://172.22.2.6/connect/PortalMain';
const PERIODIC_LOGIN_CHECK_KEY = 'periodicLoginCheck';
let originalTabId = null;
let loginPortalTabId = null;

function updateLoginAlarm(periodicLoginCheck) {
  if (!periodicLoginCheck || periodicLoginCheck <= 0) {
    periodicLoginCheck = 1; // Set to 1 minute as a default if the value is invalid
  }
  console.log("Setting alarm to check login after", periodicLoginCheck, "minutes.");
  chrome.alarms.clear('checkLoginPeriodically', () => {
    chrome.alarms.create('checkLoginPeriodically', { periodInMinutes: periodicLoginCheck });
  });
}

function setPeriodicLoginCheck(value) {
  if (!value || value <= 0) {
    value = 1; // Set to 1 minute if the value is invalid
  }

  chrome.storage.local.set({ [PERIODIC_LOGIN_CHECK_KEY]: value }, () => {
    if (chrome.runtime.lastError) {
      console.log("Error setting periodic login check:", chrome.runtime.lastError.message);
      return;
    }
    console.log('Periodic login check set to:', value);
    updateLoginAlarm(value);
  });
}

//INITIALIZER DEFINITIONS

function initializeCredentialsFlag() {
  chrome.storage.local.get(IS_CREDENTIALS_UPDATED_KEY, (data) => {
    if (chrome.runtime.lastError) {
      console.log("Error retrieving credentials flag:", chrome.runtime.lastError.message);
      return;
    }
    if (data[IS_CREDENTIALS_UPDATED_KEY] === undefined) {
      chrome.storage.local.set({ [IS_CREDENTIALS_UPDATED_KEY]: false });
    }
  });
}

function initializeAutoLoginFlag() {
  chrome.storage.local.get(AUTO_LOGIN_ENABLED_KEY, (data) => {
    if (chrome.runtime.lastError) {
      console.log("Error retrieving auto-login flag:", chrome.runtime.lastError.message);
      return;
    }
    if (data[AUTO_LOGIN_ENABLED_KEY] === undefined) {
      chrome.storage.local.set({ [AUTO_LOGIN_ENABLED_KEY]: true });
    }
  });
}

function initializePeriodicLoginCheck() {
  chrome.storage.local.get(PERIODIC_LOGIN_CHECK_KEY, (data) => {
    if (chrome.runtime.lastError) {
      console.log("Error retrieving periodic login check:", chrome.runtime.lastError.message);
      return;
    }
    const periodicLoginCheck = data[PERIODIC_LOGIN_CHECK_KEY] || 1; // Set default to 1 minute initially
    updateLoginAlarm(periodicLoginCheck);
  });
}

function storeOriginalTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.log("Error querying the active tab:", chrome.runtime.lastError.message);
      return;
    }
    if (tabs.length > 0) {
      originalTabId = tabs[0].id;
      console.log("Stored original tab id:", originalTabId);
    } else {
      console.log("No active tab found.");
    }
  });
}

function switchBackToOriginalTab() {
  if (originalTabId !== null) {
    chrome.tabs.update(originalTabId, { active: true }, () => {
      if (chrome.runtime.lastError) {
        console.log("Error switching back to original tab:", chrome.runtime.lastError.message);
      } else {
        console.log("Switched back to original tab:", originalTabId);
      }
    });
  } else {
    console.log("Original tab ID is not stored.");
  }
}

//script injector
function loginAndCloseTab(tabId) {
  loginPortalTabId = tabId;
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['login.js']
  }, () => {
    if (chrome.runtime.lastError) {
      console.log("Error injecting script:", chrome.runtime.lastError.message);
      return;
    }

    setTimeout(() => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.log(`Error finding tab with id ${tabId}:`, chrome.runtime.lastError.message);
          return;
        }

        if (tab) {
          chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
              console.log("Error closing tab:", chrome.runtime.lastError.message);
            } else {
              console.log(`Tab with id ${tabId} closed successfully.`);
            }
          });
        } else {
          console.log(`Tab with id ${tabId} does not exist or has already been closed.`);
        }
      });
    }, CLOSE_TAB_DELAY_MS); //Timeout condition
  });
}

function handleLogin() {
  chrome.storage.local.get(IS_CREDENTIALS_UPDATED_KEY, (data) => {
    if (chrome.runtime.lastError) {
      console.log("Error retrieving credentials flag:", chrome.runtime.lastError.message);
      return;
    }

    if (data[IS_CREDENTIALS_UPDATED_KEY]) {
      // First, check if there is a current window available
      storeOriginalTab();
      chrome.windows.getCurrent({ populate: true }, (window) => {
        if (chrome.runtime.lastError) {
          console.log("Error getting current window:", chrome.runtime.lastError.message);
        }

        if (!window) {
          // If no window is found, create a new window and open the tab in it
          chrome.windows.create({ url: UNIVERSITY_URL }, (newWindow) => {
            if (chrome.runtime.lastError) {
              console.log("Error creating new window:", chrome.runtime.lastError.message);
              return;
            }
            const newTabId = newWindow.tabs[0].id;
            loginAndCloseTab(newTabId);
          });
        } else {
          // If there is a current window, create the new tab in it
          chrome.tabs.create({ windowId: window.id, url: UNIVERSITY_URL, active: true}, (newTab) => {
            if (chrome.runtime.lastError) {
              console.log("Error creating new tab:", chrome.runtime.lastError.message);
              return;
            }
            loginAndCloseTab(newTab.id);
          });
        }
      });
    } else {
      console.log('Credentials not set. Login will not be attempted.');
    }
  });
}

//first check for last login and then proceed for login accordingly
function checkLogin() {
    //if auto-login is disabled, always return
  chrome.storage.local.get(AUTO_LOGIN_ENABLED_KEY, (data) => {
    if (!data[AUTO_LOGIN_ENABLED_KEY]) {
      console.log('Auto-login is disabled, skipping login check.');
      return;  // Return if auto-login is disabled
    }else{
      chrome.storage.local.get('lastLoginTime', (data) => {
        if (chrome.runtime.lastError) {
          console.error("Error getting last login time:", chrome.runtime.lastError.message);
          return;
        }
        const lastLoginTime = data.lastLoginTime || 0;
        const currentTime = Date.now();
        const timeSinceLastLogin = lastLoginTime > 0 ? currentTime - lastLoginTime : 0;
        const timeSinceLastLoginHours = timeSinceLastLogin / (1000 * 60 * 60);
    
        console.log("Time since last login (hours):", timeSinceLastLoginHours);
    
        const remainingTime = LOGIN_INTERVAL_HOURS - timeSinceLastLoginHours;
        const periodicLoginCheck = remainingTime > 0 ? remainingTime * 60 : 1;
        console.log('Next login check after', periodicLoginCheck, "minutes");
    
        if (lastLoginTime === 0 || timeSinceLastLoginHours >= LOGIN_INTERVAL_HOURS) {
          handleLogin(); //Perform login if more than 3.9 hours have passed
        } else {
          console.log('You are already logged in.');
        }
        setPeriodicLoginCheck(periodicLoginCheck);
      });
    }
  });
}

//INITIALIZERS
initializeCredentialsFlag();
initializeAutoLoginFlag();
initializePeriodicLoginCheck(); //initiates the auto feauture, by default after 1 min

//MESSAGE LISTNERS FROM POPUP AND LOGIN JS
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'manualLogin') {
    handleLogin();
    //if after installation, before the auto login starts, the user uses instant login feature, then dont update periodiclogincheck
    chrome.storage.local.get(IS_CREDENTIALS_UPDATED_KEY, (data) => {
      if (chrome.runtime.lastError) {
        console.log("Error retrieving credentials flag:", chrome.runtime.lastError.message);
        return;
      }
      if (data[IS_CREDENTIALS_UPDATED_KEY] !== undefined) {
        setPeriodicLoginCheck(239);
      }
    });

    chrome.storage.local.get('lastLoginTime', (data) => {
      console.log("Updated lastLogin time to: ", data.lastLoginTime);
    }) 
  }else if (request.action === 'closeTab') {
    // Close the login portal tab that was tracked earlier
    if (loginPortalTabId !== null) {
      chrome.tabs.remove(loginPortalTabId, () => {
        if (chrome.runtime.lastError) {
          console.log(`Error closing login portal tab: ${chrome.runtime.lastError.message}`);
        } else {
          console.log(`Login portal tab with id ${loginPortalTabId} closed successfully.`);
          switchBackToOriginalTab();
        }
      });
    }
  }else if (request.action === 'updateAutoLogin') { //temporary
    const isAutoLoginEnabled = request.autoLoginEnabled;

    // Store the auto-login status in local storage
    chrome.storage.local.get({ [AUTO_LOGIN_ENABLED_KEY]: isAutoLoginEnabled }, () => {
        console.log(`Auto-login status updated: ${isAutoLoginEnabled ? 'Enabled' : 'Disabled'}`);
    });
    // if(isAutoLoginEnabled)
    //   updateLoginAlarm();
}
});

//ONLY FOR AUTO: ENABLED FEATURES

//Handle Chrome startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Chrome startup detected, attempting login.");
  checkLogin();
});

//On installation of extension, open popup automatically
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.action.openPopup();
  }
});

// Set up idle detection (for 5 minutes of inactivity it will consider )
chrome.idle.setDetectionInterval(300);
chrome.idle.onStateChanged.addListener((newState) => {
  if (newState === "active") {
      console.log("System is active again after sleep/idle");
      // Check login status or perform any re-login tasks here
      checkLogin();
  }
});

// ALARM LISTNER (will always listen for periodicLogin , checkLogin will handle auto-login toggle check)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'checkLoginPeriodically') {
      checkLogin();
    }
  });

//Prevent service worker from dying
// solution credits: https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
async function createOffscreen() {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS'],
    justification: 'keep service worker running',
  }).catch(() => {});
}
chrome.runtime.onStartup.addListener(createOffscreen);
self.onmessage = e => {}; // keepAlive
createOffscreen();