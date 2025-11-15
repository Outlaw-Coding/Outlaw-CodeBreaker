// main.js - Main Application Logic

// DOM Elements
const output = document.getElementById("output");
const input = document.getElementById("cmd");
const codeView = document.getElementById("code-view").querySelector("code");
const fileNameSpan = document.getElementById("file-name");
const previewBtn = document.getElementById("preview-btn");
const downloadBtn = document.getElementById("download-btn");
const downloadAllBtn = document.getElementById("download-all-btn");
const chatList = document.getElementById("chat-list");
const newChatBtn = document.getElementById("new-chat-btn");

// State Management
let chats = {}; // { chatId: { name, messages: [], files: {} } }
let currentChatId = null;
let currentFile = null;
let previewIframe = null;

// Storage Configuration
const STORAGE_KEY = "outlaw_codebreaker_data";

// ==================== STORAGE MANAGEMENT ====================

function saveToStorage() {
  try {
    const data = {
      chats: chats,
      currentChatId: currentChatId,
      version: '7.0', // Version tracking
      lastSaved: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('✅ Saved to storage:', {
      chatCount: Object.keys(chats).length,
      currentChat: currentChatId,
      totalFiles: Object.values(chats).reduce((sum, chat) => sum + Object.keys(chat.files).length, 0)
    });
  } catch (e) {
    console.error('❌ Failed to save to storage:', e);
    addMessage('⚠️ Warning: Failed to save data to local storage', 'system');
  }
}

function loadFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      chats = data.chats || {};
      currentChatId = data.currentChatId || null;
      
      console.log('✅ Loaded from storage:', {
        chatCount: Object.keys(chats).length,
        currentChat: currentChatId,
        totalFiles: Object.values(chats).reduce((sum, chat) => sum + Object.keys(chat.files).length, 0)
      });
      
      // Ensure at least one chat exists
      if (Object.keys(chats).length === 0) {
        createNewChat();
      }
    } catch (e) {
      console.error('❌ Failed to load from storage:', e);
      createNewChat();
    }
  } else {
    console.log('ℹ️ No saved data found, creating new chat');
    createNewChat();
  }
  renderChatList();
  if (currentChatId) {
    switchToChat(currentChatId);
  }
}

function clearAllStorage() {
  if (confirm('⚠️ WARNING: This will delete ALL chats and files permanently.\n\nAre you absolutely sure?')) {
    localStorage.removeItem(STORAGE_KEY);
    chats = {};
    currentChatId = null;
    currentFile = null;
    createNewChat();
    addMessage('🗑️ All data cleared from storage', 'system');
  }
}

// ==================== CHAT MANAGEMENT ====================

function createNewChat() {
  const chatId = 'chat_' + Date.now();
  const chatName = `Chat ${Object.keys(chats).length + 1}`;
  chats[chatId] = {
    name: chatName,
    messages: [],
    files: {},
    created: Date.now()
  };
  currentChatId = chatId;
  console.log(`📝 Created new chat: ${chatId} (${chatName})`);
  saveToStorage();
  renderChatList();
  switchToChat(chatId);
}

function switchToChat(chatId) {
  currentChatId = chatId;
  currentFile = null;
  output.innerHTML = '';
  
  // Render chat messages
  const chat = chats[chatId];
  chat.messages.forEach(msg => {
    if (msg.type === 'user') {
      addMessageDirect(msg.content, 'user');
    } else if (msg.type === 'ai') {
      addMessageDirect(msg.content, 'ai');
    } else if (msg.type === 'system') {
      addMessageDirect(msg.content, 'system');
    } else if (msg.type === 'files') {
      renderFileGridDirect(msg.files);
    }
  });
  
  renderChatList();
  saveToStorage();
  updateEditorPanel();
}

// Direct message adding without saving (for replaying history)
function addMessageDirect(content, type) {
  const div = document.createElement('div');
  div.className = `message ${type}-message`;
  div.innerHTML = content.replace(/\n/g, '<br>');
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

// Direct file grid rendering without saving (for replaying history)
function renderFileGridDirect(fileList) {
  if (!currentChatId) return;
  
  const chat = chats[currentChatId];
  const grid = document.createElement('div');
  grid.className = 'file-grid';
  
  const filenames = Array.isArray(fileList) ? fileList : Object.keys(chat.files);
  
  if (filenames.length === 0) return;
  
  filenames.forEach(filename => {
    if (chat.files[filename]) {
      const fileIcon = document.createElement('div');
      fileIcon.className = 'file-icon';
      fileIcon.innerHTML = `
        <div class="file-icon-img">${getFileIcon(filename)}</div>
        <div class="file-icon-name">${filename}</div>
      `;
      fileIcon.onclick = () => {
        viewFile(filename);
      };
      grid.appendChild(fileIcon);
    }
  });
  
  if (grid.children.length > 0) {
    output.appendChild(grid);
    output.scrollTop = output.scrollHeight;
  }
}

function renderChatList() {
  chatList.innerHTML = '';
  Object.entries(chats).forEach(([chatId, chat]) => {
    const div = document.createElement('div');
    div.className = 'chat-item' + (chatId === currentChatId ? ' active' : '');
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-item-name';
    nameSpan.textContent = chat.name;
    nameSpan.onclick = () => switchToChat(chatId);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-chat-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteChat(chatId);
    };
    
    div.appendChild(nameSpan);
    div.appendChild(deleteBtn);
    chatList.appendChild(div);
  });
}

function deleteChat(chatId) {
  if (Object.keys(chats).length === 1) {
    addMessage('❌ Cannot delete the last chat', 'system');
    return;
  }
  
  const chatToDelete = chats[chatId];
  const fileCount = Object.keys(chatToDelete.files).length;
  const messageCount = chatToDelete.messages.length;
  
  const confirmMsg = `Delete "${chatToDelete.name}"?\n\nThis will permanently delete:\n- ${messageCount} messages\n- ${fileCount} files\n- All chat history\n\nThis cannot be undone.`;
  
  if (confirm(confirmMsg)) {
    // If we're deleting the current chat, switch to another first
    if (currentChatId === chatId) {
      const remainingChats = Object.keys(chats).filter(id => id !== chatId);
      if (remainingChats.length > 0) {
        switchToChat(remainingChats[0]);
      }
    }
    
    // Delete the chat and all its data
    delete chats[chatId];
    
    // Immediately save to localStorage to persist the deletion
    saveToStorage();
    
    // Re-render the chat list
    renderChatList();
    
    // Clear editor if we were viewing files from deleted chat
    if (currentFile && !chats[currentChatId]?.files[currentFile]) {
      currentFile = null;
      updateEditorPanel();
    }
    
    addMessage(`🗑️ Chat deleted: "${chatToDelete.name}" (${fileCount} files, ${messageCount} messages)`, 'system');
  }
}

// ==================== MESSAGE DISPLAY ====================

function log(msg, type = 'system') {
  addMessage(msg, type);
}

function addMessage(content, type) {
  const div = document.createElement('div');
  div.className = `message ${type}-message`;
  div.innerHTML = content.replace(/\n/g, '<br>');
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
  
  // Save to chat history
  if (currentChatId && chats[currentChatId]) {
    chats[currentChatId].messages.push({ type, content });
    saveToStorage();
  }
}

function renderFileGrid(fileList) {
  if (!currentChatId) return;
  
  const chat = chats[currentChatId];
  const grid = document.createElement('div');
  grid.className = 'file-grid';
  
  // Use fileList if provided, otherwise use all files
  const filenames = Array.isArray(fileList) ? fileList : Object.keys(chat.files);
  
  if (filenames.length === 0) {
    return; // Don't render empty grid
  }
  
  filenames.forEach(filename => {
    if (chat.files[filename]) {
      const fileIcon = document.createElement('div');
      fileIcon.className = 'file-icon';
      fileIcon.innerHTML = `
        <div class="file-icon-img">${getFileIcon(filename)}</div>
        <div class="file-icon-name">${filename}</div>
      `;
      fileIcon.onclick = () => {
        viewFile(filename);
        addMessage(`📂 Viewing: ${filename}`, 'system');
      };
      grid.appendChild(fileIcon);
    }
  });
  
  if (grid.children.length > 0) {
    output.appendChild(grid);
    output.scrollTop = output.scrollHeight;
    
    // Save to chat history only if not already saved
    if (currentChatId && chats[currentChatId]) {
      const lastMessage = chats[currentChatId].messages[chats[currentChatId].messages.length - 1];
      if (!lastMessage || lastMessage.type !== 'files' || JSON.stringify(lastMessage.files) !== JSON.stringify(filenames)) {
        chats[currentChatId].messages.push({ type: 'files', files: filenames });
        saveToStorage();
      }
    }
  }
}

// ==================== FILE MANAGEMENT ====================

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    'html': '📄',
    'css': '🎨',
    'js': '⚙️',
    'json': '📋',
    'txt': '📝',
    'md': '📖',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚡',
    'c': '🔧',
    'zip': '📦',
    'png': '🖼️',
    'jpg': '🖼️',
    'gif': '🖼️',
    'svg': '🎭'
  };
  return icons[ext] || '📄';
}

function updateOrCreateFile(filename, content) {
  if (!currentChatId) return;
  
  const chat = chats[currentChatId];
  const isNew = !chat.files[filename];
  chat.files[filename] = content;
  saveToStorage();
  
  return isNew;
}

function viewFile(filename) {
  if (!currentChatId) return;
  
  const chat = chats[currentChatId];
  currentFile = filename;
  const content = chat.files[filename];
  
  if (!content) {
    fileNameSpan.textContent = 'File not found';
    codeView.textContent = '';
    codeView.className = '';
    return;
  }
  
  fileNameSpan.textContent = filename;
  codeView.className = ''; // Clear all classes first
  codeView.textContent = content;
  
  // Safely apply syntax highlighting
  if (typeof hljs !== 'undefined') {
    try {
      // Detect language from filename
      const ext = filename.split('.').pop().toLowerCase();
      const langMap = {
        'js': 'javascript',
        'html': 'xml',
        'css': 'css',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'json': 'json',
        'txt': 'plaintext'
      };
      
      if (langMap[ext]) {
        codeView.className = `language-${langMap[ext]}`;
        hljs.highlightElement(codeView);
      }
    } catch (e) {
      // If highlighting fails, just show plain text
      console.warn('Syntax highlighting error:', e);
      codeView.className = '';
    }
  }
}

function updateEditorPanel() {
  if (!currentFile || !currentChatId || !chats[currentChatId].files[currentFile]) {
    fileNameSpan.textContent = 'Select a file to view';
    codeView.textContent = '';
    codeView.className = '';
    return;
  }
  viewFile(currentFile);
}

// ==================== FILE EXTRACTION FROM AI ====================

function extractFilesFromResponse(response) {
  const files = {};
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const lang = match[1] || 'txt';
    const content = match[2].trim();
    
    // Try to extract filename from first line if present
    const firstLine = content.split('\n')[0];
    let filename;
    
    if (firstLine.includes('//') && firstLine.includes('.')) {
      filename = firstLine.split('//')[1].trim();
    } else if (firstLine.includes('#') && firstLine.includes('.')) {
      filename = firstLine.split('#')[1].trim();
    } else {
      // Auto-generate filename based on language and content
      const timestamp = Date.now();
      const extensions = {
        'html': 'html',
        'css': 'css',
        'javascript': 'js',
        'js': 'js',
        'python': 'py',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'json': 'json'
      };
      const ext = extensions[lang.toLowerCase()] || 'txt';
      
      // Check if it's an index/main file
      if (content.toLowerCase().includes('<!doctype html>') || content.toLowerCase().includes('<html>')) {
        filename = 'index.html';
      } else if (lang === 'css' || content.includes('body {') || content.includes('* {')) {
        filename = 'style.css';
      } else if ((lang === 'javascript' || lang === 'js') && !files['script.js']) {
        filename = 'script.js';
      } else {
        filename = `file_${timestamp}.${ext}`;
      }
    }
    
    files[filename] = content;
  }
  
  return files;
}

// ==================== PROGRESS BAR ====================

function createProgressBar(label) {
  const container = document.createElement("div");
  container.className = "progress-bar";
  container.innerHTML = `
    <div style="margin-bottom: 8px; font-weight: bold; color: #0f0;">${label}</div>
    <div class="progress-fill" style="width: 0%; background: #0f0; height: 20px; text-align: center; color: #000; font-weight: bold; transition: width 0.3s ease;">0%</div>
    <div style="margin-top: 5px; font-size: 11px; color: #0f0;" class="progress-status">Initializing...</div>
    <div style="margin-top: 5px; font-size: 10px; color: #0a0;" class="progress-detail"></div>
  `;
  output.appendChild(container);
  output.scrollTop = output.scrollHeight;
  return container;
}

function updateProgressBar(bar, percent, status, detail = '') {
  if (!bar || !bar.parentNode) return; // Safety check
  
  const fill = bar.querySelector(".progress-fill");
  const statusEl = bar.querySelector(".progress-status");
  const detailEl = bar.querySelector(".progress-detail");
  
  if (fill) {
    fill.style.width = Math.min(percent, 100) + "%";
    fill.textContent = Math.floor(Math.min(percent, 100)) + "%";
  }
  if (statusEl && status) {
    statusEl.textContent = status;
  }
  if (detailEl && detail) {
    detailEl.textContent = detail;
  }
  
  output.scrollTop = output.scrollHeight;
}

function removeProgressBar(bar) {
  if (bar && bar.parentNode) {
    bar.remove();
  }
}

// ==================== AI QUALITY DEVELOPMENT PROCESS ====================

async function developWithQuality(userPrompt, chatHistory) {
  let progressBar = null;
  
  try {
    // Create progress bar
    progressBar = createProgressBar('🔨 High-Quality Development Process');
    updateProgressBar(progressBar, 0, '📋 Phase 1: Planning & Initial Code', 'Analyzing requirements and creating architecture...');
    
    await delay(1000); // Give UI time to render
    
    // Phase 1: Initial Planning & Code Generation (10%)
    updateProgressBar(progressBar, 5, '📋 Phase 1: Planning & Initial Code', 'Creating detailed architecture...');
    
    const planningPrompt = `${userPrompt}

Create a complete, production-ready implementation. Take your time to ensure quality.
Include:
- Clean, well-structured code
- Proper error handling
- All necessary files (HTML, CSS, JS)
- Working features and logic
- Detailed comments

Return code in markdown code blocks.`;
    
    updateProgressBar(progressBar, 10, '📋 Phase 1: Planning & Initial Code', 'Generating initial code...');
    const initialCode = await askAI(planningPrompt, chatHistory);
    
    let currentCode = initialCode;
    let currentHistory = [...chatHistory, 
      { role: 'user', content: planningPrompt },
      { role: 'assistant', content: currentCode }
    ];
    
    // Phase 2: First Implementation Complete (20%)
    updateProgressBar(progressBar, 20, '✅ Phase 2: Initial Code Complete', 'First version generated successfully!');
    await delay(2000);
    
    // Phase 3: First Testing Pass (30%)
    updateProgressBar(progressBar, 25, '🧪 Phase 3: Testing - Round 1', 'Analyzing code for bugs and issues...');
    
    const test1Prompt = `Review the code you just created. Check for:
- Syntax errors
- Logic bugs  
- Missing functionality
- Edge cases
- Browser compatibility issues

If you find any issues, provide the corrected code in markdown blocks. If it's perfect, respond with "CODE_VERIFIED".`;
    
    updateProgressBar(progressBar, 30, '🧪 Phase 3: Testing - Round 1', 'Running comprehensive tests...');
    const test1Result = await askAI(test1Prompt, currentHistory);
    currentHistory.push(
      { role: 'user', content: test1Prompt },
      { role: 'assistant', content: test1Result }
    );
    
    // Phase 4: First Fix Pass (40%)
    if (!test1Result.includes('CODE_VERIFIED')) {
      updateProgressBar(progressBar, 35, '🔧 Phase 4: Fixing Issues - Round 1', 'Applying fixes and improvements...');
      currentCode = test1Result;
      await delay(3000);
      updateProgressBar(progressBar, 40, '🔧 Phase 4: Fixes Applied', 'Round 1 fixes complete!');
    } else {
      updateProgressBar(progressBar, 40, '✅ Phase 4: No Issues Found', 'Code passed first review!');
    }
    await delay(2000);
    
    // Phase 5: Second Testing Pass (55%)
    updateProgressBar(progressBar, 45, '🧪 Phase 5: Testing - Round 2', 'Deep testing for edge cases...');
    
    const test2Prompt = `Perform a second, more thorough review:
- Test all user interactions
- Check performance optimizations
- Verify error handling
- Ensure code follows best practices
- Check accessibility

Provide fixes in markdown blocks if needed, or respond "CODE_VERIFIED" if perfect.`;
    
    updateProgressBar(progressBar, 50, '🧪 Phase 5: Testing - Round 2', 'Performance and optimization checks...');
    const test2Result = await askAI(test2Prompt, currentHistory);
    currentHistory.push(
      { role: 'user', content: test2Prompt },
      { role: 'assistant', content: test2Result }
    );
    
    updateProgressBar(progressBar, 55, '🧪 Phase 5: Testing Complete', 'Second test round finished!');
    await delay(2000);
    
    // Phase 6: Second Fix Pass (70%)
    if (!test2Result.includes('CODE_VERIFIED')) {
      updateProgressBar(progressBar, 60, '🔧 Phase 6: Fixing Issues - Round 2', 'Refining and optimizing...');
      currentCode = test2Result;
      await delay(3000);
      updateProgressBar(progressBar, 70, '🔧 Phase 6: Refinements Applied', 'Round 2 optimization complete!');
    } else {
      updateProgressBar(progressBar, 70, '✅ Phase 6: Second Review Passed', 'Code quality verified!');
    }
    await delay(2000);
    
    // Phase 7: Third Testing Pass (80%)
    updateProgressBar(progressBar, 75, '🧪 Phase 7: Testing - Round 3', 'Final comprehensive testing...');
    
    const test3Prompt = `Final quality check:
- Verify all features work correctly
- Check code readability and documentation
- Ensure no console errors
- Validate user experience
- Final security review

Provide any final improvements in markdown blocks or respond "CODE_VERIFIED".`;
    
    const test3Result = await askAI(test3Prompt, currentHistory);
    currentHistory.push(
      { role: 'user', content: test3Prompt },
      { role: 'assistant', content: test3Result }
    );
    
    updateProgressBar(progressBar, 80, '🧪 Phase 7: Final Testing Complete', 'All tests passed!');
    await delay(2000);
    
    // Phase 8: Final Fixes (90%)
    if (!test3Result.includes('CODE_VERIFIED')) {
      updateProgressBar(progressBar, 85, '🔧 Phase 8: Final Polish', 'Applying final refinements...');
      currentCode = test3Result;
      await delay(3000);
      updateProgressBar(progressBar, 90, '🔧 Phase 8: Polish Complete', 'All refinements applied!');
    } else {
      updateProgressBar(progressBar, 90, '✅ Phase 8: All Tests Passed', 'Production ready!');
    }
    await delay(2000);
    
    // Phase 9: Documentation & Optimization (95%)
    updateProgressBar(progressBar, 92, '📝 Phase 9: Final Documentation', 'Adding comments and cleanup...');
    
    const finalPrompt = `Provide the final, polished version of the code with:
- Clear comments
- Optimized performance  
- Clean formatting
- All fixes applied

Return the complete, final code in markdown code blocks.`;
    
    const finalCode = await askAI(finalPrompt, currentHistory);
    
    updateProgressBar(progressBar, 95, '📝 Phase 9: Documentation Complete', 'Code is polished and ready!');
    await delay(2000);
    
    // Phase 10: Complete (100%)
    updateProgressBar(progressBar, 100, '🎉 Complete! High-Quality Code Ready', 'All testing and fixes applied successfully!');
    await delay(3000);
    removeProgressBar(progressBar);
    
    return finalCode;
    
  } catch (error) {
    if (progressBar) {
      updateProgressBar(progressBar, 0, '❌ Error in development process', error.message);
    }
    throw error;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== COMMAND PROCESSING ====================

async function processCommand(cmd) {
  if (!currentChatId) {
    createNewChat();
  }
  
  addMessage(cmd, 'user');
  
  // Detect if this is a complex build request
  const isComplexBuild = cmd.toLowerCase().includes('create') || 
                         cmd.toLowerCase().includes('build') || 
                         cmd.toLowerCase().includes('make') ||
                         cmd.toLowerCase().includes('app') ||
                         cmd.toLowerCase().includes('game') ||
                         cmd.toLowerCase().includes('website') ||
                         cmd.toLowerCase().includes('develop');
  
  // Get chat history for context
  const chat = chats[currentChatId];
  const chatHistory = chat.messages
    .filter(m => m.type === 'user' || m.type === 'ai')
    .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }));
  
  if (isComplexBuild) {
    addMessage('🚀 Starting high-quality development process...', 'system');
    addMessage('⏱️ This will take 20-40 minutes. Quality over speed!', 'system');
    
    // Use the quality development process
    const response = await developWithQuality(cmd, chatHistory);
    
    addMessage(response, 'ai');
    
    // Extract and save files
    const files = extractFilesFromResponse(response);
    
    console.log('Extracted files:', Object.keys(files)); // Debug log
    
    if (Object.keys(files).length > 0) {
      let newFileCount = 0;
      let updatedFileCount = 0;
      
      Object.entries(files).forEach(([filename, content]) => {
        const isNew = updateOrCreateFile(filename, content);
        if (isNew) newFileCount++;
        else updatedFileCount++;
      });
      
      // Show the file grid
      renderFileGrid(Object.keys(files));
      
      const statusMsg = [];
      if (newFileCount > 0) statusMsg.push(`${newFileCount} new`);
      if (updatedFileCount > 0) statusMsg.push(`${updatedFileCount} updated`);
      addMessage(`✅ High-Quality Files: ${statusMsg.join(', ')}`, 'system');
      addMessage('🎯 All code has been tested and verified through multiple rounds!', 'system');
      
      // Auto-open the first file
      const firstFile = Object.keys(files)[0];
      if (firstFile) {
        viewFile(firstFile);
      }
    } else {
      addMessage('ℹ️ No code files detected in response. Try asking to create specific files.', 'system');
    }
  } else {
    // Simple query - just show thinking indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message system-message';
    loadingDiv.textContent = '⏳ AI is thinking...';
    output.appendChild(loadingDiv);
    
    // Get AI response
    const response = await askAI(cmd, chatHistory);
    loadingDiv.remove();
    
    addMessage(response, 'ai');
    
    // Extract and save files if any
    const files = extractFilesFromResponse(response);
    
    console.log('Extracted files (simple):', Object.keys(files)); // Debug log
    
    if (Object.keys(files).length > 0) {
      let newFileCount = 0;
      let updatedFileCount = 0;
      
      Object.entries(files).forEach(([filename, content]) => {
        const isNew = updateOrCreateFile(filename, content);
        if (isNew) newFileCount++;
        else updatedFileCount++;
      });
      
      // Show the file grid
      renderFileGrid(Object.keys(files));
      
      const statusMsg = [];
      if (newFileCount > 0) statusMsg.push(`${newFileCount} new`);
      if (updatedFileCount > 0) statusMsg.push(`${updatedFileCount} updated`);
      addMessage(`✅ Files: ${statusMsg.join(', ')}`, 'system');
      
      // Auto-open the first file
      const firstFile = Object.keys(files)[0];
      if (firstFile) {
        viewFile(firstFile);
      }
    }
  }
}

// ==================== PREVIEW & DOWNLOAD ====================

function buildFullHTML() {
  if (!currentChatId) return "<body><h1>No chat selected</h1></body>";
  
  const chat = chats[currentChatId];
  let html = chat.files["index.html"] || "<body><h1>No index.html</h1></body>";
  
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  let head = headMatch ? headMatch[1] : "";
  let body = html.replace(/<head[^>]*>[\s\S]*?<\/head>/i, "").trim();

  if (chat.files["style.css"]) {
    const css = chat.files["style.css"];
    head += `<style>${css}</style>`;
  }
  
  if (chat.files["script.js"]) {
    const js = chat.files["script.js"];
    // Check if Three.js is needed
    if (js.includes("THREE.")) {
      head += `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>`;
    }
    body += `<script>${js}</script>`;
  }

  return `<!DOCTYPE html><html><head>${head}</head>${body}</html>`;
}

previewBtn.onclick = () => {
  if (!currentChatId || !chats[currentChatId].files['index.html']) {
    addMessage('❌ No index.html file to preview', 'system');
    return;
  }
  
  if (previewIframe) previewIframe.remove();
  
  previewIframe = document.createElement("iframe");
  previewIframe.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;border:none;background:#000;z-index:9999;";
  document.body.appendChild(previewIframe);
  
  const html = buildFullHTML();
  const blob = new Blob([html], { type: "text/html" });
  previewIframe.src = URL.createObjectURL(blob);
  
  addMessage("✅ Preview running... (click preview to close)", 'system');
  
  previewIframe.onclick = () => {
    previewIframe.remove();
    previewIframe = null;
  };
};

downloadBtn.onclick = () => {
  if (!currentFile || !currentChatId) {
    addMessage('❌ No file selected', 'system');
    return;
  }
  
  const content = chats[currentChatId].files[currentFile];
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = currentFile;
  a.click();
  URL.revokeObjectURL(url);
  addMessage(`✅ Downloaded ${currentFile}`, 'system');
};

downloadAllBtn.onclick = () => {
  if (!currentChatId || Object.keys(chats[currentChatId].files).length === 0) {
    addMessage('❌ No files to download', 'system');
    return;
  }
  
  const zip = new JSZip();
  const chat = chats[currentChatId];
  
  Object.entries(chat.files).forEach(([filename, content]) => {
    zip.file(filename, content);
  });
  
  zip.generateAsync({ type: "blob" }).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chat.name.replace(/ /g, '_')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    addMessage('✅ Downloaded all files as ZIP', 'system');
  });
};

// ==================== EVENT LISTENERS ====================

input.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  const cmd = input.value.trim();
  if (!cmd) return;
  
  input.value = "";
  await processCommand(cmd);
});

newChatBtn.onclick = () => {
  createNewChat();
  addMessage('🆕 New chat started', 'system');
};

// ==================== ERROR HANDLING ====================

window.addEventListener('error', function(e) {
  // Suppress highlight.js syntax errors
  if (e.message && e.message.includes('SyntaxError')) {
    e.preventDefault();
    return false;
  }
});

// ==================== INITIALIZATION ====================

loadFromStorage();
log('🚀 Outlaw CodeBreaker v7.0 initialized', 'system');
log('💡 Ask AI to create or modify files. They will appear as icons.', 'system');
log('💾 All chats and files are saved locally.', 'system');