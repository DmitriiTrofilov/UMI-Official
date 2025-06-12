chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'displayUmiResponse') {
        const existingBox = document.getElementById('umi-response-container');
        if (existingBox) existingBox.remove();

        const container = document.createElement('div');
        container.id = 'umi-response-container';

        const header = document.createElement('div');
        header.id = 'umi-response-header';
        header.textContent = 'Umi.ai Response';

        const closeButton = document.createElement('span');
        closeButton.id = 'umi-close-button';
        closeButton.innerHTML = '×';
        
        const content = document.createElement('div');
        content.id = 'umi-response-content';
        content.innerHTML = request.data.replace(/\n/g, '<br>');

        header.appendChild(closeButton);
        container.appendChild(header);
        container.appendChild(content);
        document.body.appendChild(container);

        const style = document.createElement('style');
        style.innerHTML = `
            #umi-response-container {
                position: fixed; top: 20px; right: 20px; width: 400px; max-width: 90vw;
                max-height: 80vh; background-color: white; border: 1px solid #ddd;
                border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                z-index: 2147483647; display: flex; flex-direction: column;
                font-family: sans-serif; font-size: 14px; color: #333;
            }
            #umi-response-header {
                padding: 10px 15px; cursor: move; background-color: #7572ff; color: white;
                font-weight: bold; border-top-left-radius: 12px; border-top-right-radius: 12px;
                display: flex; justify-content: space-between; align-items: center;
            }
            #umi-close-button { cursor: pointer; font-size: 24px; font-weight: bold; line-height: 1; }
            #umi-close-button:hover { color: #e0e7ff; }
            #umi-response-content { padding: 15px; overflow-y: auto; white-space: pre-wrap; line-height: 1.6; }
            
            /* Custom Scrollbar for on-page modal */
            #umi-response-content::-webkit-scrollbar { width: 8px; }
            #umi-response-content::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
            #umi-response-content::-webkit-scrollbar-thumb {
                background-color: #c7d2fe; border-radius: 10px; border: 2px solid #f1f5f9;
            }
            #umi-response-content::-webkit-scrollbar-thumb:hover { background-color: #a5b4fc; }
        `;
        document.head.appendChild(style);

        closeButton.onclick = () => container.remove();
        
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = (e) => {
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (e) => {
                e.preventDefault();
                pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
                pos3 = e.clientX; pos4 = e.clientY;
                container.style.top = (container.offsetTop - pos2) + "px";
                container.style.left = (container.offsetLeft - pos1) + "px";
            };
        };
        // Confirm to the sender that the message was received and processed.
        sendResponse({ status: "Response successfully displayed" });
    }
    return true; // Keep the message channel open for the asynchronous response.
});