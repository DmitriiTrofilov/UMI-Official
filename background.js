// --- CONFIGURATION ---
const API_KEY = "AIzaSyA7pIYg7E0FWkV5CEfovfIWQPtBbhGkhTI";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

// --- ON-PAGE MODAL INJECTION FUNCTION ---
// This function will be injected directly onto the page. It has no access to background script variables.
function renderUmiModal(title, text, theme = 'light') {
    const existingModal = document.getElementById('umi-response-container');
    if (existingModal) existingModal.remove();

    const umiModal = document.createElement('div');
    umiModal.id = 'umi-response-container';
    umiModal.classList.add(theme === 'dark' ? 'umi-dark' : 'umi-light');

    const header = document.createElement('div');
    header.id = 'umi-response-header';
    const headerTitle = document.createElement('span');
    headerTitle.id = 'umi-header-title';
    headerTitle.textContent = title;
    const closeButton = document.createElement('span');
    closeButton.id = 'umi-close-button';
    closeButton.innerHTML = '×';
    const content = document.createElement('div');
    content.id = 'umi-response-content';
    const footer = document.createElement('div');
    footer.id = 'umi-response-footer';
    const copyButton = document.createElement('button');
    copyButton.id = 'umi-copy-button';
    copyButton.textContent = 'Copy';
    
    header.appendChild(headerTitle);
    header.appendChild(closeButton);
    footer.appendChild(copyButton);
    umiModal.appendChild(header);
    umiModal.appendChild(content);
    umiModal.appendChild(footer);
    document.body.appendChild(umiModal);

    const style = document.createElement('style');
    style.innerHTML = `
        #umi-response-container.umi-light {
            --umi-bg: #ffffff; --umi-text: #111827; --umi-border: rgba(0,0,0,0.1);
            --umi-header-bg: rgba(0,0,0,0.03); --umi-primary: #6366f1; --umi-primary-hover: #4f46e5;
            --umi-copy-text: white; --umi-scrollbar-thumb: rgba(0,0,0,0.2);
            --umi-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        #umi-response-container.umi-dark {
            --umi-bg: #111827; --umi-text: #f9fafb; --umi-border: rgba(255,255,255,0.1);
            --umi-header-bg: rgba(255,255,255,0.05); --umi-primary: #7572ff; --umi-primary-hover: #6366f1;
            --umi-copy-text: white; --umi-scrollbar-thumb: rgba(255,255,255,0.2);
            --umi-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        #umi-response-container {
            position: fixed; top: 30px; right: 30px; width: 420px; max-width: 90vw;
            background-color: var(--umi-bg); color: var(--umi-text);
            border-radius: 16px; box-shadow: var(--umi-shadow);
            z-index: 2147483647; display: flex; flex-direction: column;
            backdrop-filter: blur(5px); border: 1px solid var(--umi-border);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            opacity: 0; transform: scale(0.95);
            animation: umi-fade-in 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes umi-fade-in { to { opacity: 1; transform: scale(1); } }
        #umi-response-header { padding: 12px 18px; cursor: move; background-color: var(--umi-header-bg); border-bottom: 1px solid var(--umi-border); border-top-left-radius: 16px; border-top-right-radius: 16px; display: flex; justify-content: space-between; align-items: center; }
        #umi-header-title { font-weight: 600; font-size: 16px; color: var(--umi-primary); }
        #umi-close-button { cursor: pointer; font-size: 26px; font-weight: bold; line-height: 1; opacity: 0.7; transition: opacity 0.2s; }
        #umi-close-button:hover { opacity: 1; }
        #umi-response-content { padding: 18px; overflow-y: auto; white-space: pre-wrap; line-height: 1.6; font-size: 15px; max-height: 60vh; }
        #umi-response-footer { padding: 10px 18px; border-top: 1px solid var(--umi-border); }
        #umi-copy-button { background-color: var(--umi-primary); color: var(--umi-copy-text); border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background-color 0.2s, transform 0.2s; }
        #umi-copy-button:hover { background-color: var(--umi-primary-hover); transform: translateY(-1px); }
        #umi-copy-button.copied { background-color: #10b981; }
        #umi-response-content::-webkit-scrollbar { width: 8px; }
        #umi-response-content::-webkit-scrollbar-track { background: transparent; }
        #umi-response-content::-webkit-scrollbar-thumb { background-color: var(--umi-scrollbar-thumb); border-radius: 10px; }
    `;
    document.head.appendChild(style);

    closeButton.onclick = () => { umiModal.remove(); style.remove(); };
    copyButton.onclick = () => {
        navigator.clipboard.writeText(text);
        copyButton.textContent = 'Copied!'; copyButton.classList.add('copied');
        setTimeout(() => { copyButton.textContent = 'Copy'; copyButton.classList.remove('copied'); }, 1500);
    };

    let i = 0;
    content.innerHTML = "";
    const typingInterval = setInterval(() => {
        if (i < text.length) {
            content.innerHTML += text.charAt(i); i++; content.scrollTop = content.scrollHeight;
        } else { clearInterval(typingInterval); }
    }, 10);
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    header.onmousedown = (e) => {
        e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
        document.onmousemove = (e) => {
            e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            umiModal.style.top = (umiModal.offsetTop - pos2) + "px";
            umiModal.style.left = (umiModal.offsetLeft - pos1) + "px";
        };
    };
}


// --- API CALLER ---
const callGeminiAPI = async (prompt, fileData = null) => {
    let parts = [{ text: prompt }];
    if (fileData) {
        parts.push({ inline_data: { mime_type: fileData.mimeType, data: fileData.base64 }});
    }
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
    });
    if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(`API Error ${res.status}: ${errorBody.error.message}`);
    }
    const data = await res.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("No text content received from API.");
    return responseText;
};

// --- CORE LOGIC FUNCTION ---
async function processAndDisplay(prompt, title, tabId, frameId, fileData = null) {
    try {
        const { theme } = await chrome.storage.local.get('theme');
        const effectiveTheme = theme || 'light';

        chrome.scripting.executeScript({
            target: { tabId: tabId, frameIds: [frameId] },
            function: renderUmiModal,
            args: [title, 'Umi is thinking...', effectiveTheme]
        });

        const result = await callGeminiAPI(prompt, fileData);

        chrome.scripting.executeScript({
            target: { tabId: tabId, frameIds: [frameId] },
            function: renderUmiModal,
            args: [title, result, effectiveTheme]
        });
        return { success: true };

    } catch (error) {
        console.error("Umi Error:", error);
        try {
            const { theme } = await chrome.storage.local.get('theme');
            chrome.scripting.executeScript({
                target: { tabId: tabId, frameIds: [frameId] },
                function: renderUmiModal,
                args: ['Error', `Failed to get response: ${error.message}`, theme || 'light']
            });
        } catch (injectionError) {
             console.error("FATAL: Could not inject error message.", injectionError);
        }
        return { success: false, message: error.message };
    }
}


// --- CONTEXT MENU SETUP & LISTENER ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({ id: "umi-parent", title: "Umi.ai Tools", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "humanize", title: "✨ Humanize Text", parentId: "umi-parent", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "summarize", title: "📚 Summarize Text", parentId: "umi-parent", contexts: ["selection"] });
    chrome.contextMenus.create({ id: "explain", title: "💡 Explain Text", parentId: "umi-parent", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!info.selectionText) return;
    let prompt = "", title = "", selection = info.selectionText;
    switch (info.menuItemId) {
        case "humanize":
            title = "✨ Humanized Text";
            prompt = `Rewrite the following text to be more human-written and simple. Use shorter sentences, simpler vocabulary, and an easy-to-understand tone. Do not use markdown. The text is: "${selection}"`;
            break;
        case "summarize":
            title = "📚 Summary";
            prompt = `Provide a concise summary of the following text, capturing the main points. Do not use markdown. The text is: "${selection}"`;
            break;
        case "explain":
            title = "💡 Explanation";
            prompt = `Explain the core concepts of the following text in simple terms, as if to a beginner. Do not use markdown. The text is: "${selection}"`;
            break;
    }
    if (prompt && tab.id) processAndDisplay(prompt, title, tab.id, info.frameId || 0);
});


// --- MESSAGE LISTENERS FOR POPUP & OTHER REQUESTS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'processQueryOnPage') {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (!tabs[0] || !tabs[0].id) {
                sendResponse({ success: false, message: "No active tab found." });
                return;
            }
            const result = await processAndDisplay(request.prompt, request.title, tabs[0].id, 0, request.fileData);
            sendResponse(result);
        });
        return true; // Indicates async response
    }
    
    if (request.action === 'captureScreenshot') {
        chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, message: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, dataUrl: dataUrl });
            }
        });
        return true; // Keep channel open for async response
    }
});