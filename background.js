function logError(context, error) {
    console.error(`${context} — ${error}`);
}

function saveScreenshot(imageData, callback) {
    chrome.storage.local.set({ screenshotUrl: imageData }, () => {
        console.log('Screenshot data stored in local storage.');
        if (callback) callback();
    });
}

function takeScreenshot(windowId, onCaptured) {
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError) {
            logError('Screenshot capture error', chrome.runtime.lastError.message);
            onCaptured(null, chrome.runtime.lastError.message);
        } else {
            console.log('Captured tab image.');
            onCaptured(dataUrl, null);
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureScreenshot') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab || !activeTab.windowId) {
                logError('Screenshot error', 'No active tab found.');
                sendResponse({ status: 'error', message: 'No active tab found' });
                return;
            }

            takeScreenshot(activeTab.windowId, (screenshotDataUrl, error) => {
                if (error) {
                    sendResponse({ status: 'error', message: error });
                    return;
                }
                saveScreenshot(screenshotDataUrl, () => {
                    sendResponse({ status: 'screenshotCaptured' });
                });
            });
        });
        return true; // Indicates that the response is sent asynchronously.
    }
});