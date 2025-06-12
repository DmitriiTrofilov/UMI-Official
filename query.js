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
let typingInterval = null;

// --- API & RESPONSE HANDLING ---

// API Call for IN-POPUP requests ONLY
const callGeminiForPopup = async (prompt, fileData = null) => {
    setStatus('loading');
    let parts = [{ text: prompt }];
    if (fileData) {
        parts.push({ inline_data: { mime_type: fileData.mimeType, data: fileData.base64 }});
    }

    try {
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
    } catch (err) {
        setStatus(`Error: ${err.message}`, true);
        throw err;
    }
};

const typeAnimation = (element, text) => {
    if (typingInterval) clearInterval(typingInterval);
    let i = 0;
    element.innerHTML = "";
    element.style.display = 'block';
    
    typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            element.scrollTop = element.scrollHeight;
        } else {
            clearInterval(typingInterval);
            setStatus('Response received!');
        }
    }, 15);
};

// --- EVENT LISTENERS ---

askButton.addEventListener('click', async () => {
    const question = userInput.value.trim();
    if (!question && !uploadedFile) {
        setStatus("Please ask a question or upload a file.", true);
        return;
    }
    popupResponseBox.style.display = 'none';

    try {
        const prompt = buildPrompt(question, !!uploadedFile, false);
        const result = await callGeminiForPopup(prompt, uploadedFile);
        typeAnimation(popupResponseBox, result);
    } catch (err) {
        console.error("In-popup query failed:", err);
    }
});

analyzePageButton.addEventListener('click', async () => {
    const question = userInput.value.trim();
    popupResponseBox.style.display = 'none';
    setStatus('loading');
    
    try {
        let analysisObject = null;
        let isScreenshot = false;
        
        if (uploadedFile) {
            analysisObject = uploadedFile;
        } else {
            // Take screenshot via background script to avoid permission issues
            const response = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
            if (response && response.dataUrl) {
                analysisObject = { mimeType: 'image/png', base64: response.dataUrl.split(',')[1] };
                isScreenshot = true;
            } else {
                throw new Error(response.message || "Failed to capture screenshot.");
            }
        }

        const prompt = buildPrompt(question, true, isScreenshot);
        
        // **NEW ROBUST METHOD:** Ask background script to handle everything
        const result = await chrome.runtime.sendMessage({
            action: 'processQueryOnPage',
            prompt: prompt,
            title: 'Umi.ai Page Analysis',
            fileData: analysisObject
        });

        if (result.success) {
            setStatus('Response displayed on page!');
        } else {
            // **INTELLIGENT FALLBACK**
            setStatus(`On-page display failed: ${result.message}. Showing here.`, true);
            const fallbackResult = await callGeminiForPopup(prompt, analysisObject);
            typeAnimation(popupResponseBox, "FALLBACK RESPONSE:\n\n" + fallbackResult);
        }

    } catch(err) {
        console.error("On-page analysis failed:", err);
        setStatus(`Error: ${err.message}`, true);
    }
});

// Re-add captureScreenshot listener to `background.js` since it's cleaner
// In background.js, add:
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//    if(request.action === 'captureScreenshot') { ... } // see below for full code
// });

dropZone.addEventListener('click', () => fileInput.click());
['dragover', 'drop', 'dragenter', 'dragleave'].forEach(eName => dropZone.addEventListener(eName, e => {
    e.preventDefault(); e.stopPropagation();
    if (eName === 'dragenter' || eName === 'dragover') dropZone.classList.add('active');
    else if (eName === 'dragleave') dropZone.classList.remove('active');
    else if (eName === 'drop') {
        dropZone.classList.remove('active');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    }
}));
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]) });

// --- HELPER FUNCTIONS ---
const buildPrompt = (question, hasFile, isScreenshot) => {
    let context = "You are Umi, a helpful AI assistant. Your response should be clear, well-structured, and without markdown formatting.";
    let fileContext = hasFile ? (isScreenshot ? 'this webpage screenshot' : 'the provided document') : '';
    let query = question 
      ? `Based on ${fileContext}, answer the following: "${question}"`
      : `Summarize ${fileContext}. List key takeaways in a bulleted list.`;
    if (!hasFile && question) query = `Answer the user's question: "${question}"`;
    return `${context}\n\n${query}`;
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

async function handleFile(file) {
    setStatus(`Processing ${file.name}...`);
    uploadedFile = null;
    try {
        const mimeType = getMimeType(file.name, file.type);
        if (!mimeType) throw new Error(`Unsupported file: ${file.name}`);
        const base64 = await fileToBase64(file);
        uploadedFile = { mimeType, base64 };
        setStatus(`Ready to analyze ${file.name}`);
        dropZone.textContent = `📄 ${file.name}`;
    } catch (error) {
        setStatus(`Error: ${error.message}`, true);
        dropZone.textContent = 'Drop file or Click to Upload';
    }
}

function getMimeType(fileName, fileType) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeMap = {'pdf':'application/pdf', 'docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'txt':'text/plain'};
    if (mimeMap[ext]) return mimeMap[ext];
    if (fileType.startsWith('image/')) return fileType;
    return null;
}

function setStatus(message, isError = false) {
    if (message === 'loading') {
        statusBox.innerHTML = `Umi is thinking... <div class="loading-dots"><span></span><span></span><span></span></div>`;
    } else {
        statusBox.innerHTML = message;
    }
    statusBox.style.color = isError ? '#f87171' : 'var(--text-light)';
}

// Add this to background.js to complete the screenshot functionality
/*
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // ... other message listeners
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
*/