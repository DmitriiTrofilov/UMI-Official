// --- CONFIGURATION ---
const API_KEY = "AIzaSyA7pIYg7E0FWkV5CEfovfIWQPtBbhGkhTI";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

// --- DOM ELEMENTS ---
const userInput = document.getElementById('user-input');
const askButton = document.getElementById('ask-button');
const analyzePageButton = document.getElementById('analyze-page-button');
const statusBox = document.getElementById('status-box');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const popupResponseBox = document.getElementById('popup-response-box');

// --- GLOBAL STATE ---
let uploadedFile = null;

// --- API & RESPONSE HANDLING ---
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

const displayResponseInPopup = (text) => {
    popupResponseBox.textContent = text;
    popupResponseBox.style.display = 'block';
    statusBox.textContent = 'Response received!';
};

// ** ROBUST On-Page Display Function **
const displayResponseInPage = (text) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
            statusBox.textContent = "Error: Could not find active tab.";
            return;
        }
        const tabId = tabs[0].id;
        
        // 1. Ensure the content script is injected and ready.
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).then(() => {
            // 2. Now send the message. This is much more reliable.
            chrome.tabs.sendMessage(tabId, { action: 'displayUmiResponse', data: text }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Messaging failed after injection:", chrome.runtime.lastError.message);
                    statusBox.textContent = "Error: Failed to connect. Please reload the page.";
                    displayResponseInPopup("Fallback: Could not display on page.\n\n" + text);
                } else {
                    statusBox.textContent = 'Response displayed on page!';
                }
            });
        }).catch(err => {
            console.error("Script injection failed:", err);
            statusBox.textContent = "Error: Could not inject script into page.";
        });
    });
};

// --- EVENT LISTENERS ---

// "Ask (Show in Popup)" Button: Uses text and/or file.
askButton.addEventListener('click', async () => {
    const question = userInput.value.trim();
    if (!question && !uploadedFile) {
        statusBox.textContent = "Please ask a question or upload a file.";
        return;
    }
    statusBox.textContent = 'Umi is thinking...';
    popupResponseBox.style.display = 'none';

    try {
        const prompt = buildPrompt(question, !!uploadedFile, false);
        const result = await callGeminiAPI(prompt, uploadedFile);
        displayResponseInPopup(result);
    } catch (err) {
        console.error("In-popup query failed:", err);
        statusBox.textContent = `Error: ${err.message}`;
    }
});

// "Ask & Display on Page" Button: Uses text and file OR text and screenshot.
analyzePageButton.addEventListener('click', async () => {
    const question = userInput.value.trim();
    popupResponseBox.style.display = 'none';
    statusBox.textContent = 'Analyzing...';
    
    try {
        let analysisObject = null;
        let isScreenshot = false;
        
        if (uploadedFile) {
            analysisObject = uploadedFile;
        } else {
            statusBox.textContent = 'Capturing page...';
            analysisObject = await takeScreenshot();
            isScreenshot = true;
        }

        const prompt = buildPrompt(question, true, isScreenshot);
        const result = await callGeminiAPI(prompt, analysisObject);
        displayResponseInPage(result);

    } catch(err) {
        console.error("On-page analysis failed:", err);
        statusBox.textContent = `Error: ${err.message}`;
    }
});

dropZone.addEventListener('click', () => fileInput.click());
['dragover', 'drop'].forEach(eName => dropZone.addEventListener(eName, e => {
    e.preventDefault(); e.stopPropagation();
    if (eName === 'drop') {
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }
}));
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]) });

// --- HELPER FUNCTIONS ---
const takeScreenshot = () => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
        if (response.status === 'screenshotCaptured') {
            chrome.storage.local.get(['screenshotUrl'], (result) => {
                if (result.screenshotUrl) {
                    const base64Image = result.screenshotUrl.split(',')[1];
                    resolve({ mimeType: 'image/png', base64: base64Image });
                } else reject(new Error("Failed to get screenshot from storage."));
            });
        } else reject(new Error(response.message || "Screenshot failed."));
    });
});

const buildPrompt = (question, hasFile, isScreenshot) => {
    let context = "You are Umi, a helpful AI assistant.";
    let instruction = "First, provide a concise one-paragraph explanation of the context from the provided content. Then, on a new line, give your direct answer or summary. Do not use markdown formatting like bold or italics.";
    let query = "";

    if (hasFile) {
        const fileType = isScreenshot ? 'screenshot' : 'document';
        query = question ? `Based on the provided ${fileType}, answer the user's question: "${question}"` : `Summarize the provided ${fileType}. List key takeaways in a bulleted list.`;
    } else {
        query = `Answer the user's question: "${question}"`;
    }

    return `${context} ${instruction}\n\n${query}`;
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

async function handleFile(file) {
    dropZone.textContent = `📄 ${file.name}`;
    statusBox.textContent = `Processing ${file.name}...`;
    uploadedFile = null;

    try {
        const mimeType = getMimeType(file.name, file.type);
        if (!mimeType) throw new Error(`Unsupported file: ${file.name}`);

        const base64 = await fileToBase64(file);
        uploadedFile = { mimeType, base64 };
        statusBox.textContent = `File ready! Ask a question and choose where to see the answer.`;

    } catch (error) {
        console.error("File processing error:", error);
        statusBox.textContent = `Error: ${error.message}`;
        dropZone.textContent = 'Drop file here or click to upload';
    }
}

function getMimeType(fileName, fileType) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeMap = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
    };
    if (mimeMap[ext]) return mimeMap[ext];
    if (fileType.startsWith('image/')) return fileType;
    return null;
}