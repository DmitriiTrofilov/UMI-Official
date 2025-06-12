// --- GLOBAL STATE ---
let umiModal = null;
let typingInterval = null;

// --- CORE FUNCTION to create and display the modal ---
function displayUmiModal(title, text) {
    // If a modal already exists, remove it to prevent duplicates
    if (umiModal) {
        umiModal.remove();
    }
    // Clear any previous typing animation
    if (typingInterval) {
        clearInterval(typingInterval);
    }

    // --- CREATE ELEMENTS ---
    umiModal = document.createElement('div');
    umiModal.id = 'umi-response-container';
    
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

    // --- ASSEMBLE ---
    header.appendChild(headerTitle);
    header.appendChild(closeButton);
    footer.appendChild(copyButton);
    umiModal.appendChild(header);
    umiModal.appendChild(content);
    umiModal.appendChild(footer);
    document.body.appendChild(umiModal);

    // --- ADD STYLES ---
    const style = document.createElement('style');
    style.innerHTML = `
        :root { --umi-primary: #7572ff; --umi-dark: #111827; --umi-light: #f9fafb; }
        #umi-response-container {
            position: fixed; top: 30px; right: 30px; width: 420px; max-width: 90vw;
            background-color: var(--umi-dark); color: var(--umi-light);
            border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 2147483647; display: flex; flex-direction: column;
            backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            opacity: 0; transform: scale(0.95);
            animation: umi-fade-in 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes umi-fade-in { to { opacity: 1; transform: scale(1); } }
        #umi-response-header {
            padding: 12px 18px; cursor: move; background-color: rgba(255,255,255,0.05);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            border-top-left-radius: 16px; border-top-right-radius: 16px;
            display: flex; justify-content: space-between; align-items: center;
        }
        #umi-header-title { font-weight: 600; font-size: 16px; color: var(--umi-primary); }
        #umi-close-button { cursor: pointer; font-size: 26px; font-weight: bold; line-height: 1; opacity: 0.7; transition: opacity 0.2s; }
        #umi-close-button:hover { opacity: 1; }
        #umi-response-content { padding: 18px; overflow-y: auto; white-space: pre-wrap; line-height: 1.6; font-size: 15px; max-height: 60vh; }
        #umi-response-footer { padding: 10px 18px; border-top: 1px solid rgba(255,255,255,0.1); }
        #umi-copy-button {
            background-color: var(--umi-primary); color: white; border: none; border-radius: 8px;
            padding: 8px 16px; font-size: 14px; font-weight: 500; cursor: pointer;
            transition: background-color 0.2s, transform 0.2s;
        }
        #umi-copy-button:hover { background-color: #6366f1; transform: translateY(-1px); }
        #umi-copy-button.copied { background-color: #10b981; }
        #umi-response-content::-webkit-scrollbar { width: 8px; }
        #umi-response-content::-webkit-scrollbar-track { background: transparent; }
        #umi-response-content::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.2); border-radius: 10px; }
    `;
    document.head.appendChild(style);

    // --- ADD FUNCTIONALITY ---
    closeButton.onclick = () => {
        umiModal.style.animation = 'umi-fade-out 0.2s forwards';
        umiModal.addEventListener('animationend', () => umiModal.remove(), { once: true });
        style.remove();
    };
    
    copyButton.onclick = () => {
        navigator.clipboard.writeText(text);
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('copied');
        setTimeout(() => {
            copyButton.textContent = 'Copy';
            copyButton.classList.remove('copied');
        }, 1500);
    };

    makeDraggable(umiModal, header);

    // --- START TYPING ANIMATION ---
    typeAnimation(content, text);
}

function typeAnimation(element, text) {
    if (text === "Thinking...") { // Special case for loading
        element.innerHTML = text;
        return;
    }
    
    let i = 0;
    element.innerHTML = "";
    typingInterval = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            element.scrollTop = element.scrollHeight; // Auto-scroll
        } else {
            clearInterval(typingInterval);
        }
    }, 10); // Adjust speed here (lower is faster)
}

function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = (e) => {
        e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
        document.onmousemove = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        };
    };
}

// --- MESSAGE LISTENER from background or popup script ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // This action is used by both the context menu and the popup's "Display on Page" button.
    if (request.action === 'displayUmiResponse') {
        displayUmiModal(request.title || "Umi.ai Response", request.data);
        sendResponse({ status: "Response received by content script." });
    }
    return true; // Keep channel open for async response
});