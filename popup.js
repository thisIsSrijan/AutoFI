document.addEventListener('DOMContentLoaded', () => {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const saveButton = document.getElementById('save');
    const manualLoginButton = document.getElementById('manualLogin');
    const updateCredentialsButton = document.getElementById('updateCredentials');
    const credentialsForm = document.getElementById('credentialsForm');
    const autoLoginToggle = document.getElementById('autoLoginToggle');
    const autoLoginStatus = document.getElementById('autoLoginStatus');
    const AUTO_LOGIN_ENABLED_KEY = 'autoLoginEnabled';

    //Load saved credentials from Chrome storage
    chrome.storage.sync.get(['username', 'password'], (result) => {
        if (result.username && result.password) {
            document.getElementById('greetingMessage').textContent = `Login ID: ${result.username}`;
            document.getElementById('greeting').style.display = 'block';
            credentialsForm.style.display = 'none';
        } else {
            credentialsForm.style.display = 'block';
        }
    });

    //Load & set the auto-login toggle state
    chrome.storage.local.get('autoLoginEnabled', (data) => {
        if (data.autoLoginEnabled !== undefined) {
            autoLoginToggle.checked = data.autoLoginEnabled;
        } else {
            //default state is true if autoLoginEnabled is not found
            autoLoginToggle.checked = true;
            chrome.storage.local.set({ autoLoginEnabled: true });
        }
        updateAutoLoginStatus();
    });

    //Update the auto-login status text
    function updateAutoLoginStatus() {
        if(autoLoginStatus !== null)
            autoLoginStatus.textContent = `Auto-Login: ${autoLoginToggle.checked ? 'On' : 'Off'}`;
    }

    //Save the credentials to Chrome storage
    saveButton.addEventListener('click', () => {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (username && password) {
            chrome.storage.sync.set({ username, password }, () => {
                alert('Credentials saved successfully!');
                document.getElementById('greetingMessage').textContent = `Login ID: ${username}`;
                document.getElementById('greeting').style.display = 'block';
                credentialsForm.style.display = 'none';
            });

            chrome.storage.local.set({ isCredentialsUpdated: true }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error updating credentials flag:", chrome.runtime.lastError.message);
                }
            });
        } else {
            alert('Please enter both username and password.');
        }
    });

    //Allow updating the credentials
    updateCredentialsButton.addEventListener('click', () => {
        document.getElementById('greeting').style.display = 'none';
        credentialsForm.style.display = 'block';
    });

    // Handle manual login request
    manualLoginButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'manualLogin' });
    });

    // Add an event listener to update the auto-login status when the toggle changes
    autoLoginToggle.addEventListener('change', () => {
        const isChecked = autoLoginToggle.checked;
        chrome.storage.local.set({ [AUTO_LOGIN_ENABLED_KEY]: isChecked }, () => {
            // Send a message to background.js to update the status
            chrome.runtime.sendMessage({ action: 'updateAutoLogin', autoLoginEnabled: isChecked });
            updateAutoLoginStatus();
        });
    });

    // //redirecting to my linkedin
    const developerLink = document.getElementById('developerId');
    developerLink.addEventListener('click', () => {
        chrome.tabs.create({ url: "https://www.linkedin.com/in/dassrijan16/" });
    });
});