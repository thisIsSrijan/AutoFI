# AutoFi - Automate Your University Wi-Fi Login

AutoFi is a Chrome extension that automates the login process for the LNMIIT Wi-Fi network. No more interruptions in your online assessments or competitive programming—AutoFi ensures you're always connected!

## Features

- **Automatic Re-login:** AutoFi logs you back in immediately when your connection is lost or after idle time.
- **Real-Time Logout Detection:** Detects when the network logs you out and re-authenticates instantly.
- **Dynamic Periodic Checks:** Uses alarms to dynamically calculate the next login time, based on current login status.
- **Idle Detection:** Automatically logs in after your system wakes up from idle or sleep.
- **Instant Login:** Option to trigger immediate login manually when required.
- **Tab Management:** Automatically switches back to your active tab post-login.
- **Insanely Fast Script Execution:** Experience fast script injection and network login with no noticeable delays.

## Technical Implementation

- **chrome.alarms API:** Used to handle dynamic periodic login checks, recalculating intervals based on the last successful login time.
- **chrome.scripting API:** Injects scripts into the login portal and handles tab management with minimal delay.
- **chrome.idle API:** Detects system wake and initiates login without user intervention.
- **Local Storage:** Used to store login status, time of last login, and user settings (such as periodic check intervals and auto-login enable/disable).
- **Custom DOM Algorithm:** Developed an algorithm to wait for specific elements in the login page's DOM before initiating the login process, ensuring asynchronous content loading and network throttling are handled efficiently.

## Installation

1. Clone or download this repository.
2. Load the extension in Chrome by visiting `chrome://extensions/` and enabling Developer Mode.
3. Click "Load unpacked" and select the folder where you downloaded AutoFi.
4. Set your credentials and start automating your Wi-Fi login!
5. You can debug easily by checking the service worker of the extension.

## Customization for Your Network

If you want AutoFi to work for your college or organization, simply replace the necessary selector elements in the **login.js** file to match the login portal's HTML structure and directly call the **tryLogin** function instead of calling the **tryLoginProcess** function.

## License

MIT License
