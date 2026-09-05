const { app, BrowserWindow, session, components, globalShortcut, Tray, Menu, Notification, nativeImage, ipcMain, dialog } = require('electron');
const net = require('net');
const path = require('path');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {

  // ==========================================
  // CONFIGURATION & SAVES
  // ==========================================
  const configPath = path.join(app.getPath('userData'), 'nintendo-music-config.json');
  const customThemesPath = path.join(app.getPath('userData'), 'nintendo-music-custom-themes.json');

  let config = {
    rpcEnabled: true,
    rpcPrivateMode: false,
    notificationsEnabled: true,
    theme: 'dark',
    borderRadius: 'default',
    autoStart: false,
    startMinimized: false,
    alwaysOnTop: false,
    hardwareAccel: true,
    customCSS: '',
    customCSSEnabled: false,
    activeCustomTheme: null
  };

  let customThemes = {};

  try {
    if (fs.existsSync(configPath)) {
      config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    }
  } catch (e) {
    console.error("Config load error:", e);
  }

  try {
    if (fs.existsSync(customThemesPath)) {
      customThemes = JSON.parse(fs.readFileSync(customThemesPath, 'utf8'));
    }
  } catch (e) {
    console.error("Custom themes load error:", e);
  }

  function saveConfig() {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
      console.error("Config save error:", e);
    }
  }

  function saveCustomThemes() {
    try {
      fs.writeFileSync(customThemesPath, JSON.stringify(customThemes, null, 2));
    } catch (e) {
      console.error("Custom themes save error:", e);
    }
  }

  // ==========================================
  // ELECTRON SYSTEM SETTINGS
  // ==========================================
  if (!config.hardwareAccel) {
    app.disableHardwareAcceleration();
  }

  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('disable-features', 'WebAuthentication');

  const customUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  app.userAgentFallback = customUserAgent;

  const CLIENT_ID = '1517925767013601340';
  let mainWindow = null;
  let themeEditorWindow = null;
  let tray = null;
  let isAppQuitting = false;

  app.setLoginItemSettings({
    openAtLogin: config.autoStart,
    openAsHidden: config.startMinimized
  });

  // ==========================================
  // CSS THEMES & VISUAL CUSTOMIZATION
  // ==========================================
  let currentThemeKey = null;
  let currentRadiusKey = null;
  let currentCustomCSSKey = null;

  const themesCSS = {
    dark: ``,
    light: `
      html { filter: invert(100%) hue-rotate(180deg); background: #ffffff; }
      img, video, iframe, .artwork, canvas, [style*="background-image"] { filter: invert(100%) hue-rotate(180deg); }
    `,
    purple: `
      :root {
        --_1hr2ce00: #f3e8ff !important;
        --_1hr2ce01: #d8b4fea6 !important;
        --_1hr2ce02: #d8b4fe61 !important;
        --_1hr2ce06: #f3e8ff !important;
        --_1hr2ce07: #ffffff !important;
        --_1hr2ce03: #0f0518 !important;
        --_1hr2ce04: #1a0b2e !important;
        --_1hr2ce05: #2e1065 !important;
        --_1hr2ce08: #0f0518 !important;
        --_1hr2ce09: #1a0b2e !important;
        --_1hr2ce0a: #2e1065 !important;
        --_1hr2ce0n: #1a0b2e !important;
        --_1hr2ce0p: #1a0b2e !important;
        --_1hr2ce013: #1a0b2e !important;
        --_1hr2ce015: #1a0b2e !important;
        --_1hr2ce017: #9333ea !important;
        --_1hr2ce018: #2e1065 !important;
        --_1hr2ce0f: #a855f71a !important;
        --_1hr2ce0g: #120420b8 !important;
        --_1hr2ce0h: #120420a3 !important;
        --_1hr2ce0i: #0f051899 !important;
        --_1hr2ce0j: #0f051899 !important;
        --_1hr2ce0l: #0f0518cb !important;
        --_1hr2ce0o: #a855f70a !important;
        --_1hr2ce0q: #a855f714 !important;
        --_1hr2ce0r: #a855f71a !important;
        --_1hr2ce0s: #a855f729 !important;
        --_1hr2ce0t: #a855f71a !important;
        --_1hr2ce0v: #a855f733 !important;
        --_1hr2ce0w: #a855f726 !important;
        --_1hr2ce0k: #00000000 !important;
        --_1hr2ce0x: #1a0b2e00 !important;
        --_1hr2ce0y: #1a0b2e0d !important;
        --_1hr2ce0z: #1a0b2e33 !important;
        --_1hr2ce010: #1a0b2e59 !important;
        --_1hr2ce011: #1a0b2e80 !important;
        --_1hr2ce012: #1a0b2e00 !important;
        --_1hr2ce014: #0f051800 !important;
        --_1hr2ce0b: #a855f7 !important;
        --_1hr2ce0c: #9333ea !important;
        --_1hr2ce016: #a855f74d !important;
        --_1hr2ce0m: #d946ef !important;
        --_1hr2ce0u: #a855f71a !important;
      }
      ::-webkit-scrollbar-thumb { background: #9333ea !important; border-radius: 4px; }
      ::-webkit-scrollbar-track { background: #0f0518 !important; }
      ::-webkit-scrollbar { width: 6px; }
      ::selection { background: #9333ea !important; color: #fff !important; }
      img, video, canvas,
      [class*="image"], [class*="thumbnail"], [class*="artwork"], [class*="cover"], [class*="avatar"] {
        filter: none !important;
        background-color: transparent !important;
      }
    `
  };

  // Génère un thème CSS à partir d'une palette de couleurs custom
  function generateThemeCSS(colors) {
    const { accent, bg1, bg2, bg3, text1, text2 } = colors;

    // Convertit hex en rgba avec opacité
    function hexAlpha(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
      return `${hex}${a}`;
    }

    return `
      :root {
        --_1hr2ce00: ${text1} !important;
        --_1hr2ce01: ${hexAlpha(text1, 0.65)} !important;
        --_1hr2ce02: ${hexAlpha(text1, 0.38)} !important;
        --_1hr2ce06: ${text1} !important;
        --_1hr2ce07: #ffffff !important;
        --_1hr2ce03: ${bg1} !important;
        --_1hr2ce04: ${bg2} !important;
        --_1hr2ce05: ${bg3} !important;
        --_1hr2ce08: ${bg1} !important;
        --_1hr2ce09: ${bg2} !important;
        --_1hr2ce0a: ${bg3} !important;
        --_1hr2ce0n: ${bg2} !important;
        --_1hr2ce0p: ${bg2} !important;
        --_1hr2ce013: ${bg2} !important;
        --_1hr2ce015: ${bg2} !important;
        --_1hr2ce017: ${text2} !important;
        --_1hr2ce018: ${bg3} !important;
        --_1hr2ce0f: ${hexAlpha(accent, 0.10)} !important;
        --_1hr2ce0g: ${hexAlpha(bg1, 0.72)} !important;
        --_1hr2ce0h: ${hexAlpha(bg1, 0.64)} !important;
        --_1hr2ce0i: ${hexAlpha(bg1, 0.60)} !important;
        --_1hr2ce0j: ${hexAlpha(bg1, 0.60)} !important;
        --_1hr2ce0l: ${hexAlpha(bg1, 0.80)} !important;
        --_1hr2ce0o: ${hexAlpha(accent, 0.04)} !important;
        --_1hr2ce0q: ${hexAlpha(accent, 0.08)} !important;
        --_1hr2ce0r: ${hexAlpha(accent, 0.10)} !important;
        --_1hr2ce0s: ${hexAlpha(accent, 0.16)} !important;
        --_1hr2ce0t: ${hexAlpha(accent, 0.10)} !important;
        --_1hr2ce0v: ${hexAlpha(accent, 0.20)} !important;
        --_1hr2ce0w: ${hexAlpha(accent, 0.15)} !important;
        --_1hr2ce0k: #00000000 !important;
        --_1hr2ce0x: ${bg2}00 !important;
        --_1hr2ce0y: ${bg2}0d !important;
        --_1hr2ce0z: ${bg2}33 !important;
        --_1hr2ce010: ${bg2}59 !important;
        --_1hr2ce011: ${bg2}80 !important;
        --_1hr2ce012: ${bg2}00 !important;
        --_1hr2ce014: ${bg1}00 !important;
        --_1hr2ce0b: ${accent} !important;
        --_1hr2ce0c: ${accent} !important;
        --_1hr2ce016: ${hexAlpha(accent, 0.30)} !important;
        --_1hr2ce0m: ${accent} !important;
        --_1hr2ce0u: ${hexAlpha(accent, 0.10)} !important;
      }
      ::-webkit-scrollbar-thumb { background: ${accent} !important; border-radius: 4px; }
      ::-webkit-scrollbar-track { background: ${bg1} !important; }
      ::-webkit-scrollbar { width: 6px; }
      ::selection { background: ${accent} !important; color: #fff !important; }
      img, video, canvas,
      [class*="image"], [class*="thumbnail"], [class*="artwork"], [class*="cover"], [class*="avatar"] {
        filter: none !important;
        background-color: transparent !important;
      }
    `;
  }

  async function applyTheme(themeName) {
    config.theme = themeName;
    config.activeCustomTheme = null;
    saveConfig();
    if (!mainWindow) return;

    if (currentThemeKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentThemeKey); } catch (e) {}
      currentThemeKey = null;
    }

    if (themesCSS[themeName]) {
      try { currentThemeKey = await mainWindow.webContents.insertCSS(themesCSS[themeName]); } catch (e) {}
    }

    rebuildMenu();
  }

  async function applyCustomTheme(themeName) {
    if (!customThemes[themeName]) return;
    config.theme = 'custom';
    config.activeCustomTheme = themeName;
    saveConfig();
    if (!mainWindow) return;

    if (currentThemeKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentThemeKey); } catch (e) {}
      currentThemeKey = null;
    }

    const theme = customThemes[themeName];
    let css = '';
    if (theme.type === 'palette') {
      css = generateThemeCSS(theme.colors);
    } else if (theme.type === 'css') {
      css = theme.css;
    }

    if (css) {
      try { currentThemeKey = await mainWindow.webContents.insertCSS(css); } catch (e) {}
    }

    rebuildMenu();
  }

  async function applyCustomCSS(css) {
    config.customCSS = css;
    config.customCSSEnabled = true;
    saveConfig();
    if (!mainWindow) return;

    if (currentCustomCSSKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentCustomCSSKey); } catch (e) {}
      currentCustomCSSKey = null;
    }

    if (css) {
      try { currentCustomCSSKey = await mainWindow.webContents.insertCSS(css); } catch (e) {}
    }
  }

  async function disableCustomCSS() {
    config.customCSSEnabled = false;
    saveConfig();
    if (!mainWindow) return;

    if (currentCustomCSSKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentCustomCSSKey); } catch (e) {}
      currentCustomCSSKey = null;
    }
  }

  async function applyBorderRadius(radiusValue) {
    config.borderRadius = radiusValue;
    saveConfig();
    if (!mainWindow) return;

    if (currentRadiusKey) {
      try { await mainWindow.webContents.removeInsertedCSS(currentRadiusKey); } catch (e) {}
      currentRadiusKey = null;
    }

    if (radiusValue !== 'default') {
      const radiusNum = parseInt(radiusValue);
      const radiusCSS = `
        :root, html, body {
          --radius-xlarge: ${radiusNum}px !important;
          --radius-large: ${radiusNum}px !important;
          --radius-medium: ${radiusNum}px !important;
          --radius-small: ${Math.max(0, radiusNum - 4)}px !important;
        }
        button, input, img, .artwork, a, card,
        [class*="button"], [class*="card"], [class*="thumbnail"], [class*="image"] {
          border-radius: ${radiusNum}px !important;
        }
      `;
      try { currentRadiusKey = await mainWindow.webContents.insertCSS(radiusCSS); } catch (e) {}
    }
  }

  // ==========================================
  // THEME EDITOR WINDOW
  // ==========================================
  function createThemeEditorWindow() {
    if (themeEditorWindow && !themeEditorWindow.isDestroyed()) {
      themeEditorWindow.focus();
      return;
    }

    themeEditorWindow = new BrowserWindow({
      width: 820,
      height: 720,
      title: 'Theme Editor — Nintendo Music Client',
      parent: mainWindow,
      modal: false,
      resizable: true,
      minimizable: true,
      maximizable: false,
      backgroundColor: '#0f0f0f',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    themeEditorWindow.setMenuBarVisibility(false);

    const editorHTML = buildThemeEditorHTML();
    themeEditorWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(editorHTML));

    themeEditorWindow.on('closed', () => {
      themeEditorWindow = null;
    });
  }

  function buildThemeEditorHTML() {
    const themesJSON = JSON.stringify(customThemes);
    const configJSON = JSON.stringify({
      customCSS: config.customCSS,
      customCSSEnabled: config.customCSSEnabled,
      activeCustomTheme: config.activeCustomTheme
    });

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Theme Editor</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg0: #0a0a0a;
    --bg1: #111111;
    --bg2: #1a1a1a;
    --bg3: #242424;
    --bg4: #2e2e2e;
    --border: #333333;
    --accent: #a855f7;
    --accent-dim: #7c3aed;
    --text1: #f4f4f4;
    --text2: #a0a0a0;
    --text3: #606060;
    --danger: #ef4444;
    --success: #22c55e;
    --radius: 8px;
  }

  body {
    background: var(--bg0);
    color: var(--text1);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Header */
  .header {
    background: var(--bg1);
    border-bottom: 1px solid var(--border);
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .header h1 {
    font-size: 15px;
    font-weight: 600;
    color: var(--text1);
    flex: 1;
  }
  .header-icon {
    width: 24px; height: 24px;
    background: var(--accent);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
  }

  /* Tabs */
  .tabs {
    background: var(--bg1);
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 0;
    flex-shrink: 0;
  }
  .tab {
    padding: 10px 20px;
    cursor: pointer;
    color: var(--text2);
    font-size: 13px;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
    user-select: none;
  }
  .tab:hover { color: var(--text1); }
  .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  /* Content */
  .content {
    flex: 1;
    overflow: hidden;
    display: flex;
  }
  .tab-panel {
    display: none;
    flex: 1;
    overflow: hidden;
  }
  .tab-panel.active {
    display: flex;
    flex-direction: column;
  }

  /* Sidebar + main split */
  .split {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .sidebar {
    width: 220px;
    background: var(--bg1);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }
  .sidebar-header {
    padding: 12px 16px 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
  }
  .sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
  }
  .sidebar-item {
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text2);
    font-size: 13px;
    transition: all 0.1s;
    user-select: none;
  }
  .sidebar-item:hover { background: var(--bg3); color: var(--text1); }
  .sidebar-item.active { background: var(--bg3); color: var(--text1); }
  .sidebar-item .item-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .sidebar-item .item-type {
    font-size: 10px;
    color: var(--text3);
    margin-left: auto;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sidebar-actions {
    padding: 8px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  /* Main panel */
  .main-panel {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Form elements */
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text2);
  }
  .field input[type="text"],
  .field input[type="color"],
  .field textarea,
  .field select {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text1);
    font-family: inherit;
    font-size: 13px;
    padding: 8px 10px;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
  }
  .field input[type="text"]:focus,
  .field textarea:focus {
    border-color: var(--accent);
  }
  .field textarea {
    resize: vertical;
    min-height: 80px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
  }

  /* Color palette grid */
  .color-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .color-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .color-field label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text2);
  }
  .color-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .color-row input[type="color"] {
    width: 40px;
    height: 36px;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg2);
    cursor: pointer;
    flex-shrink: 0;
  }
  .color-row input[type="text"] {
    flex: 1;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text1);
    font-family: 'Consolas', monospace;
    font-size: 13px;
    padding: 8px 10px;
    outline: none;
  }
  .color-row input[type="text"]:focus { border-color: var(--accent); }

  /* Preview bar */
  .preview-bar {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .preview-label { font-size: 11px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
  .preview-swatch {
    display: flex;
    gap: 6px;
    flex: 1;
  }
  .preview-swatch .sw {
    width: 24px; height: 24px;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0;
  }

  /* Buttons */
  .btn {
    padding: 7px 14px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text1);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.1s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .btn:hover { background: var(--bg4); border-color: #555; }
  .btn.btn-primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .btn.btn-primary:hover { background: var(--accent-dim); border-color: var(--accent-dim); }
  .btn.btn-danger { color: var(--danger); border-color: var(--danger); }
  .btn.btn-danger:hover { background: #1a0a0a; }
  .btn.btn-success { color: var(--success); border-color: var(--success); }
  .btn.btn-success:hover { background: #0a1a0a; }
  .btn.btn-sm { padding: 5px 10px; font-size: 11px; flex: 1; justify-content: center; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Section titles */
  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 2px;
  }

  /* Toast */
  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(60px);
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 13px;
    color: var(--text1);
    z-index: 9999;
    transition: transform 0.2s ease;
    pointer-events: none;
    white-space: nowrap;
  }
  .toast.show { transform: translateX(-50%) translateY(0); }
  .toast.success { border-color: var(--success); color: var(--success); }
  .toast.error { border-color: var(--danger); color: var(--danger); }

  /* Empty state */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text3);
  }
  .empty-state .icon { font-size: 36px; }
  .empty-state p { font-size: 13px; }

  /* CSS editor panel */
  .css-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow: hidden;
  }
  .css-toolbar {
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .css-editor {
    flex: 1;
    background: var(--bg1);
    border: none;
    color: #e2e8f0;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
    padding: 16px;
    resize: none;
    outline: none;
    width: 100%;
    tab-size: 2;
  }
  .css-status {
    background: var(--bg2);
    border-top: 1px solid var(--border);
    padding: 6px 16px;
    font-size: 11px;
    color: var(--text3);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--text3);
  }
  .status-dot.active { background: var(--success); }

  /* Divider */
  .divider {
    height: 1px;
    background: var(--border);
    margin: 4px 0;
  }

  .row { display: flex; gap: 10px; align-items: center; }
  .flex-1 { flex: 1; }

  /* Import drop zone */
  .drop-zone {
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    padding: 24px;
    text-align: center;
    color: var(--text3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .drop-zone:hover, .drop-zone.drag-over {
    border-color: var(--accent);
    background: rgba(168, 85, 247, 0.05);
    color: var(--text2);
  }
  .drop-zone .dz-icon { font-size: 28px; margin-bottom: 8px; }
  .drop-zone p { font-size: 13px; }
  .drop-zone small { font-size: 11px; color: var(--text3); }
</style>
</head>
<body>

<div class="header">
  <div class="header-icon">🎨</div>
  <h1>Theme Editor</h1>
  <button class="btn" onclick="closeWindow()">✕ Fermer</button>
</div>

<div class="tabs">
  <div class="tab active" onclick="switchTab('palette')">🎨 Thèmes palette</div>
  <div class="tab" onclick="switchTab('css')">{ } CSS personnalisé</div>
  <div class="tab" onclick="switchTab('import')">📥 Importer</div>
</div>

<div class="content">

  <!-- ===== PALETTE TAB ===== -->
  <div class="tab-panel active" id="panel-palette">
    <div class="split">
      <div class="sidebar">
        <div class="sidebar-header">Mes thèmes</div>
        <div class="sidebar-list" id="theme-list">
          <!-- populated by JS -->
        </div>
        <div class="sidebar-actions">
          <button class="btn btn-sm" onclick="newPaletteTheme()">+ Nouveau</button>
          <button class="btn btn-sm" onclick="duplicateTheme()">⎘ Dupliquer</button>
        </div>
      </div>

      <div class="main-panel" id="palette-editor">
        <div class="empty-state" id="palette-empty">
          <div class="icon">🎨</div>
          <p>Sélectionne ou crée un thème</p>
          <button class="btn btn-primary" onclick="newPaletteTheme()">+ Créer un thème</button>
        </div>

        <div id="palette-form" style="display:none; flex-direction:column; gap:20px;">
          <div class="field">
            <label>Nom du thème</label>
            <input type="text" id="theme-name" placeholder="Mon super thème..." oninput="onNameChange()">
          </div>

          <div>
            <div class="section-title" style="margin-bottom:12px;">Palette de couleurs</div>
            <div class="color-grid">
              <div class="color-field">
                <label>🟣 Accent (boutons, liens...)</label>
                <div class="color-row">
                  <input type="color" id="c-accent" oninput="syncColor('accent', this.value)">
                  <input type="text" id="t-accent" placeholder="#a855f7" oninput="syncText('accent', this.value)">
                </div>
              </div>
              <div class="color-field">
                <label>⬛ Fond principal</label>
                <div class="color-row">
                  <input type="color" id="c-bg1" oninput="syncColor('bg1', this.value)">
                  <input type="text" id="t-bg1" placeholder="#0f0518" oninput="syncText('bg1', this.value)">
                </div>
              </div>
              <div class="color-field">
                <label>🟫 Fond secondaire (cartes...)</label>
                <div class="color-row">
                  <input type="color" id="c-bg2" oninput="syncColor('bg2', this.value)">
                  <input type="text" id="t-bg2" placeholder="#1a0b2e" oninput="syncText('bg2', this.value)">
                </div>
              </div>
              <div class="color-field">
                <label>🟪 Fond tertiaire (bordures...)</label>
                <div class="color-row">
                  <input type="color" id="c-bg3" oninput="syncColor('bg3', this.value)">
                  <input type="text" id="t-bg3" placeholder="#2e1065" oninput="syncText('bg3', this.value)">
                </div>
              </div>
              <div class="color-field">
                <label>⬜ Texte principal</label>
                <div class="color-row">
                  <input type="color" id="c-text1" oninput="syncColor('text1', this.value)">
                  <input type="text" id="t-text1" placeholder="#f3e8ff" oninput="syncText('text1', this.value)">
                </div>
              </div>
              <div class="color-field">
                <label>🩶 Texte secondaire</label>
                <div class="color-row">
                  <input type="color" id="c-text2" oninput="syncColor('text2', this.value)">
                  <input type="text" id="t-text2" placeholder="#d8b4fe" oninput="syncText('text2', this.value)">
                </div>
              </div>
            </div>
          </div>

          <div class="preview-bar">
            <span class="preview-label">Aperçu</span>
            <div class="preview-swatch">
              <div class="sw" id="sw-bg1" title="Fond principal"></div>
              <div class="sw" id="sw-bg2" title="Fond cartes"></div>
              <div class="sw" id="sw-bg3" title="Fond hover"></div>
              <div class="sw" id="sw-accent" title="Accent"></div>
              <div class="sw" id="sw-text1" title="Texte principal"></div>
              <div class="sw" id="sw-text2" title="Texte secondaire"></div>
            </div>
          </div>

          <div class="row">
            <button class="btn btn-primary" onclick="applyCurrentTheme()">▶ Appliquer</button>
            <button class="btn" onclick="saveCurrentTheme()">💾 Sauvegarder</button>
            <div class="flex-1"></div>
            <button class="btn btn-danger" onclick="deleteCurrentTheme()">🗑 Supprimer</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== CSS TAB ===== -->
  <div class="tab-panel" id="panel-css">
    <div class="css-panel">
      <div class="css-toolbar">
        <span style="font-size:12px; color: #a0a0a0; font-weight:600;">CSS INJECTÉ</span>
        <div class="flex-1"></div>
        <button class="btn" onclick="applyCSSEditor()">▶ Appliquer</button>
        <button class="btn" onclick="saveCSSAsTheme()">💾 Sauver comme thème</button>
        <button class="btn btn-danger" id="css-disable-btn" onclick="disableCSS()" style="display:none">⏹ Désactiver</button>
      </div>
      <textarea class="css-editor" id="css-editor" placeholder="/* Colle ton CSS ici — il sera injecté dans Nintendo Music */

/* Exemple : changer la couleur d'accentuation */
:root {
  --_1hr2ce0b: #ff6b35 !important;
}

/* Exemple : masquer la sidebar */
/* aside { display: none !important; } */
" spellcheck="false"></textarea>
      <div class="css-status">
        <div class="status-dot" id="css-status-dot"></div>
        <span id="css-status-text">Inactif</span>
        <div class="flex-1"></div>
        <span id="css-char-count">0 caractères</span>
      </div>
    </div>
  </div>

  <!-- ===== IMPORT TAB ===== -->
  <div class="tab-panel" id="panel-import">
    <div class="main-panel">
      <div>
        <div class="section-title" style="margin-bottom:12px;">Importer un fichier CSS</div>
        <div class="drop-zone" id="drop-zone" onclick="triggerFileOpen('css')">
          <div class="dz-icon">📄</div>
          <p>Glisse un fichier <strong>.css</strong> ici</p>
          <small>ou clique pour parcourir</small>
        </div>
      </div>

      <div class="divider"></div>

      <div>
        <div class="section-title" style="margin-bottom:12px;">Importer un thème (.json)</div>
        <div class="drop-zone" id="drop-zone-json" onclick="triggerFileOpen('json')">
          <div class="dz-icon">🎨</div>
          <p>Glisse un fichier <strong>.json</strong> ici</p>
          <small>ou clique pour parcourir</small>
        </div>
      </div>

      <div class="divider"></div>

      <div>
        <div class="section-title" style="margin-bottom:12px;">Exporter mes thèmes</div>
        <div class="row" style="gap:10px; flex-wrap:wrap;">
          <button class="btn" onclick="exportThemes()">📤 Exporter tous les thèmes (.json)</button>
          <button class="btn" onclick="exportCurrentCSS()">📤 Exporter CSS actuel (.css)</button>
        </div>
      </div>

      <div>
        <div class="section-title" style="margin-bottom:12px;">Variables CSS de Nintendo Music</div>
        <p style="color:#606060; font-size:12px; line-height:1.7; background: var(--bg2); border: 1px solid var(--border); border-radius:8px; padding:14px; font-family: monospace;">
          Les variables identifiées dans le site :<br><br>
          <span style="color:#a855f7">--_1hr2ce0b</span> → Couleur accent (rouge Nintendo)<br>
          <span style="color:#a855f7">--_1hr2ce00</span> → Texte principal<br>
          <span style="color:#a855f7">--_1hr2ce03</span> → Fond très sombre<br>
          <span style="color:#a855f7">--_1hr2ce04</span> → Fond cartes<br>
          <span style="color:#a855f7">--_1hr2ce0n</span> → Panneau latéral<br>
          <span style="color:#a855f7">--_1hr2ce0p</span> → Surface secondaire<br>
          <span style="color:#a855f7">--_1hr2ce0b</span> → Accent rouge<br>
          <span style="color:#a855f7">--_1hr2ce0c</span> → Bleu<br>
          <br>
          <span style="color:#606060;">Ajoute </span><span style="color:#22c55e;">!important</span><span style="color:#606060;"> après chaque valeur.</span>
        </p>
      </div>
    </div>
  </div>

</div>

<div class="toast" id="toast"></div>

<script>
const { ipcRenderer } = require('electron');

// ====== STATE ======
let customThemes = ${themesJSON};
let appConfig = ${configJSON};
let selectedThemeId = null;
let currentColors = { accent: '#a855f7', bg1: '#0f0518', bg2: '#1a0b2e', bg3: '#2e1065', text1: '#f3e8ff', text2: '#d8b4fe' };
let isDirty = false;

// ====== INIT ======
function init() {
  renderThemeList();
  
  // Restore CSS editor
  const cssEditor = document.getElementById('css-editor');
  cssEditor.value = appConfig.customCSS || '';
  updateCSSStatus(appConfig.customCSSEnabled);
  updateCharCount();
  cssEditor.addEventListener('input', updateCharCount);

  // Setup drop zones
  setupDropZone('drop-zone', 'css');
  setupDropZone('drop-zone-json', 'json');

  // Select active theme if any
  if (appConfig.activeCustomTheme && customThemes[appConfig.activeCustomTheme]) {
    selectTheme(appConfig.activeCustomTheme);
  }
}

// ====== TABS ======
function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const names = ['palette', 'css', 'import'];
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
}

// ====== THEME LIST ======
function renderThemeList() {
  const list = document.getElementById('theme-list');
  const keys = Object.keys(customThemes);
  
  if (keys.length === 0) {
    list.innerHTML = '<div style="padding:16px; color:#606060; font-size:12px; text-align:center;">Aucun thème custom</div>';
    return;
  }

  list.innerHTML = keys.map(id => {
    const theme = customThemes[id];
    const isActive = id === appConfig.activeCustomTheme;
    const color = theme.type === 'palette' ? theme.colors.accent : '#888';
    return \`<div class="sidebar-item \${selectedThemeId === id ? 'active' : ''}" onclick="selectTheme('\${id}')">
      <div class="item-dot" style="background:\${color}"></div>
      <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${theme.name}</span>
      \${isActive ? '<span style="color:#22c55e; font-size:10px;">●</span>' : ''}
      <span class="item-type">\${theme.type === 'palette' ? 'PAL' : 'CSS'}</span>
    </div>\`;
  }).join('');
}

function selectTheme(id) {
  selectedThemeId = id;
  const theme = customThemes[id];
  renderThemeList();

  if (theme.type === 'palette') {
    document.getElementById('palette-empty').style.display = 'none';
    document.getElementById('palette-form').style.display = 'flex';
    document.getElementById('theme-name').value = theme.name;
    currentColors = { ...theme.colors };
    Object.keys(currentColors).forEach(k => {
      const colorInput = document.getElementById('c-' + k);
      const textInput = document.getElementById('t-' + k);
      if (colorInput) colorInput.value = currentColors[k];
      if (textInput) textInput.value = currentColors[k];
    });
    updateSwatches();
  }
}

// ====== PALETTE ======
function newPaletteTheme() {
  const id = 'theme_' + Date.now();
  customThemes[id] = {
    name: 'Nouveau thème',
    type: 'palette',
    colors: { ...currentColors }
  };
  renderThemeList();
  selectTheme(id);
}

function duplicateTheme() {
  if (!selectedThemeId || !customThemes[selectedThemeId]) return;
  const src = customThemes[selectedThemeId];
  const id = 'theme_' + Date.now();
  customThemes[id] = JSON.parse(JSON.stringify(src));
  customThemes[id].name = src.name + ' (copie)';
  renderThemeList();
  selectTheme(id);
}

function onNameChange() {
  if (!selectedThemeId) return;
  customThemes[selectedThemeId].name = document.getElementById('theme-name').value;
  renderThemeList();
}

function syncColor(key, value) {
  currentColors[key] = value;
  document.getElementById('t-' + key).value = value;
  updateSwatches();
}

function syncText(key, value) {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    currentColors[key] = value;
    document.getElementById('c-' + key).value = value;
    updateSwatches();
  }
}

function updateSwatches() {
  Object.keys(currentColors).forEach(k => {
    const sw = document.getElementById('sw-' + k);
    if (sw) sw.style.background = currentColors[k];
  });
}

function saveCurrentTheme() {
  if (!selectedThemeId) return;
  customThemes[selectedThemeId].colors = { ...currentColors };
  customThemes[selectedThemeId].name = document.getElementById('theme-name').value;
  ipcRenderer.send('save-custom-themes', customThemes);
  renderThemeList();
  showToast('Thème sauvegardé !', 'success');
}

function applyCurrentTheme() {
  saveCurrentTheme();
  ipcRenderer.send('apply-custom-theme', selectedThemeId);
  appConfig.activeCustomTheme = selectedThemeId;
  renderThemeList();
  showToast('Thème appliqué !', 'success');
}

function deleteCurrentTheme() {
  if (!selectedThemeId) return;
  if (!confirm('Supprimer ce thème ?')) return;
  delete customThemes[selectedThemeId];
  if (appConfig.activeCustomTheme === selectedThemeId) {
    appConfig.activeCustomTheme = null;
    ipcRenderer.send('reset-theme');
  }
  selectedThemeId = null;
  ipcRenderer.send('save-custom-themes', customThemes);
  renderThemeList();
  document.getElementById('palette-empty').style.display = 'flex';
  document.getElementById('palette-form').style.display = 'none';
  showToast('Thème supprimé', 'error');
}

// ====== CSS EDITOR ======
function updateCharCount() {
  const val = document.getElementById('css-editor').value;
  document.getElementById('css-char-count').textContent = val.length.toLocaleString('fr') + ' caractères';
}

function updateCSSStatus(active) {
  document.getElementById('css-status-dot').classList.toggle('active', active);
  document.getElementById('css-status-text').textContent = active ? 'CSS actif' : 'Inactif';
  document.getElementById('css-disable-btn').style.display = active ? 'inline-flex' : 'none';
}

function applyCSSEditor() {
  const css = document.getElementById('css-editor').value.trim();
  if (!css) { showToast('Aucun CSS à appliquer', 'error'); return; }
  ipcRenderer.send('apply-custom-css', css);
  appConfig.customCSSEnabled = true;
  updateCSSStatus(true);
  showToast('CSS appliqué !', 'success');
}

function disableCSS() {
  ipcRenderer.send('disable-custom-css');
  appConfig.customCSSEnabled = false;
  updateCSSStatus(false);
  showToast('CSS désactivé', 'error');
}

function saveCSSAsTheme() {
  const css = document.getElementById('css-editor').value.trim();
  if (!css) { showToast('Aucun CSS à sauvegarder', 'error'); return; }
  const name = prompt('Nom du thème CSS :', 'Mon thème CSS');
  if (!name) return;
  const id = 'theme_' + Date.now();
  customThemes[id] = { name, type: 'css', css };
  ipcRenderer.send('save-custom-themes', customThemes);
  renderThemeList();
  switchTab('palette');
  selectTheme(id);
  showToast('Thème CSS sauvegardé !', 'success');
}

// ====== IMPORT / EXPORT ======
function setupDropZone(zoneId, type) {
  const zone = document.getElementById(zoneId);
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file, type);
  });
}

function triggerFileOpen(type) {
  ipcRenderer.send('open-file-dialog', type);
}

ipcRenderer.on('file-content', (e, { content, type, name }) => {
  if (type === 'css') {
    document.getElementById('css-editor').value = content;
    updateCharCount();
    switchTab('css');
    showToast('Fichier CSS importé !', 'success');
  } else if (type === 'json') {
    try {
      const imported = JSON.parse(content);
      Object.assign(customThemes, imported);
      ipcRenderer.send('save-custom-themes', customThemes);
      renderThemeList();
      switchTab('palette');
      showToast('Thèmes importés !', 'success');
    } catch {
      showToast('JSON invalide', 'error');
    }
  }
});

function handleImportFile(file, type) {
  const reader = new FileReader();
  reader.onload = e => {
    const content = e.target.result;
    if (type === 'css') {
      document.getElementById('css-editor').value = content;
      updateCharCount();
      switchTab('css');
      showToast('Fichier CSS importé !', 'success');
    } else if (type === 'json') {
      try {
        const imported = JSON.parse(content);
        Object.assign(customThemes, imported);
        ipcRenderer.send('save-custom-themes', customThemes);
        renderThemeList();
        switchTab('palette');
        showToast('Thèmes importés !', 'success');
      } catch {
        showToast('JSON invalide', 'error');
      }
    }
  };
  reader.readAsText(file);
}

function exportThemes() {
  if (Object.keys(customThemes).length === 0) { showToast('Aucun thème à exporter', 'error'); return; }
  ipcRenderer.send('export-file', { content: JSON.stringify(customThemes, null, 2), defaultName: 'nintendo-music-themes.json', type: 'json' });
}

function exportCurrentCSS() {
  const css = document.getElementById('css-editor').value.trim();
  if (!css) { showToast('Aucun CSS à exporter', 'error'); return; }
  ipcRenderer.send('export-file', { content: css, defaultName: 'nintendo-music-custom.css', type: 'css' });
}

// ====== TOAST ======
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2200);
}

function closeWindow() { ipcRenderer.send('close-theme-editor'); }

// ====== RUN ======
init();
</script>
</body>
</html>`;
  }

  // ==========================================
  // IPC HANDLERS (Theme Editor <-> Main)
  // ==========================================
  ipcMain.on('save-custom-themes', (event, themes) => {
    customThemes = themes;
    saveCustomThemes();
    rebuildMenu();
  });

  ipcMain.on('apply-custom-theme', (event, themeId) => {
    applyCustomTheme(themeId);
  });

  ipcMain.on('reset-theme', () => {
    applyTheme('dark');
  });

  ipcMain.on('apply-custom-css', (event, css) => {
    applyCustomCSS(css);
  });

  ipcMain.on('disable-custom-css', () => {
    disableCustomCSS();
  });

  ipcMain.on('close-theme-editor', () => {
    if (themeEditorWindow && !themeEditorWindow.isDestroyed()) {
      themeEditorWindow.close();
    }
  });

  ipcMain.on('open-file-dialog', async (event, type) => {
    const filters = type === 'css'
      ? [{ name: 'CSS Files', extensions: ['css'] }]
      : [{ name: 'JSON Files', extensions: ['json'] }];

    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters
    });

    if (!result.canceled && result.filePaths.length > 0) {
      try {
        const content = fs.readFileSync(result.filePaths[0], 'utf8');
        const name = path.basename(result.filePaths[0]);
        event.sender.send('file-content', { content, type, name });
      } catch (e) {
        console.error('File read error:', e);
      }
    }
  });

  ipcMain.on('export-file', async (event, { content, defaultName, type }) => {
    const filters = type === 'css'
      ? [{ name: 'CSS Files', extensions: ['css'] }]
      : [{ name: 'JSON Files', extensions: ['json'] }];

    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters
    });

    if (!result.canceled && result.filePath) {
      try {
        fs.writeFileSync(result.filePath, content, 'utf8');
      } catch (e) {
        console.error('File write error:', e);
      }
    }
  });

  // ==========================================
  // DISCORD RPC
  // ==========================================
  let ipc = null;
  let ipcReady = false;
  let nonce = 1;
  let recvBuffer = Buffer.alloc(0);
  let discordInterval = null;
  let lastActivityCache = { title: null, isPlaying: null, end: 0, private: false };

  function encodeFrame(op, payload) {
    const json = JSON.stringify(payload);
    const jsonLen = Buffer.byteLength(json, 'utf8');
    const buf = Buffer.alloc(8 + jsonLen);
    buf.writeUInt32LE(op, 0);
    buf.writeUInt32LE(jsonLen, 4);
    buf.write(json, 8, 'utf8');
    return buf;
  }

  function sendFrame(op, payload) {
    if (ipc && !ipc.destroyed) {
      try { ipc.write(encodeFrame(op, payload)); } catch {}
    }
  }

  function clearActivity() {
    sendFrame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: null }, nonce: String(nonce++) });
  }

  function pushActivity() {
    if (!ipcReady || !mainWindow || !config.rpcEnabled) return;

    mainWindow.webContents.executeJavaScript(`
      (() => {
        try {
          let isPlaying = false, currentTime = 0, duration = 0;
          const medias = document.querySelectorAll('audio, video');
          for (const media of medias) {
            if (!media.paused && !media.muted) {
              isPlaying = true; currentTime = media.currentTime; duration = media.duration; break;
            }
          }
          if (isPlaying && navigator.mediaSession && navigator.mediaSession.metadata) {
            const meta = navigator.mediaSession.metadata;
            return { title: meta.title, artist: meta.artist || 'Nintendo', album: meta.album || null, artworkUrl: meta.artwork?.length > 0 ? meta.artwork[meta.artwork.length - 1].src : null, isPlaying: true, currentTime, duration };
          }
          return { title: null, artist: 'Nintendo', album: null, artworkUrl: null, isPlaying: false, currentTime: 0, duration: 0 };
        } catch (e) {
          return { title: null, artist: 'Nintendo', album: null, artworkUrl: null, isPlaying: false, currentTime: 0, duration: 0 };
        }
      })();
    `).then((data) => {
      let { title, artist, album, artworkUrl, isPlaying, currentTime, duration } = data;
      const assets = {};
      const nowSeconds = Math.round(Date.now() / 1000);
      let startTimestamp = null, endTimestamp = null;

      if (isPlaying && duration > 0) {
        startTimestamp = Math.round(nowSeconds - currentTime);
        endTimestamp = Math.round(startTimestamp + duration);
      }

      if (config.rpcPrivateMode && isPlaying) {
        title = "Hidden Track"; artist = "Private Mode"; album = null; artworkUrl = 'nintendo_music_logo';
      }

      const isSameTrack = lastActivityCache.title === title && lastActivityCache.isPlaying === isPlaying;
      const isSameTime = Math.abs(lastActivityCache.end - (endTimestamp || 0)) < 3;
      const isSamePrivateState = lastActivityCache.private === config.rpcPrivateMode;
      if (isSameTrack && isSameTime && isSamePrivateState) return;

      if (config.notificationsEnabled && lastActivityCache.title !== data.title && isPlaying && data.title && Notification.isSupported()) {
        new Notification({ title: data.title, body: data.artist, silent: true }).show();
      }

      lastActivityCache = { title, isPlaying, end: (endTimestamp || 0), private: config.rpcPrivateMode };
      assets.large_image = artworkUrl || 'nintendo_music_logo';

      // Le nom du jeu (album) remplace l'artiste générique en 2e ligne ;
      // "Nintendo" n'apparaît qu'une fois (en info-bulle), et seulement si le
      // nom du jeu prend déjà sa place en 2e ligne (sinon ce serait un doublon).
      const gameTitle = (album && album !== artist) ? album : null;
      if (gameTitle) {
        assets.large_text = artist;
      }

      const activityObj = {
        type: 2,
        details: (isPlaying && title) ? title : 'Browsing menus',
        state: (isPlaying && title) ? (gameTitle || artist) : 'Paused / Browsing',
        assets,
        instance: false,
      };

      if (isPlaying && startTimestamp && endTimestamp) {
        activityObj.timestamps = { start: startTimestamp, end: endTimestamp };
      }

      sendFrame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity: activityObj }, nonce: String(nonce++) });
    }).catch(err => console.error('[Discord] Error:', err));
  }

  function parseFrames(data) {
    recvBuffer = Buffer.concat([recvBuffer, data]);
    while (recvBuffer.length >= 8) {
      const len = recvBuffer.readUInt32LE(4);
      if (recvBuffer.length < 8 + len) break;
      const json = recvBuffer.slice(8, 8 + len).toString('utf8');
      recvBuffer = recvBuffer.slice(8 + len);
      try {
        const msg = JSON.parse(json);
        if (msg.evt === 'READY') { ipcReady = true; if (config.rpcEnabled) pushActivity(); }
      } catch (e) {}
    }
  }

  function connectIPC(attempt) {
    if (ipcReady || !config.rpcEnabled) return;
    if (attempt > 9) return setTimeout(() => connectIPC(0), 15000);
    const pipePath = process.platform === 'win32'
      ? `\\\\?\\pipe\\discord-ipc-${attempt}`
      : `${process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || '/tmp'}/discord-ipc-${attempt}`;
    const socket = net.createConnection(pipePath);
    const connectTimeout = setTimeout(() => {
      if (!ipcReady && !socket.destroyed) { socket.destroy(); connectIPC(attempt + 1); }
    }, 2000);
    socket.on('connect', () => {
      clearTimeout(connectTimeout);
      ipc = socket; ipcReady = false; recvBuffer = Buffer.alloc(0);
      socket.write(encodeFrame(0, { v: 1, client_id: CLIENT_ID }));
    });
    socket.on('data', parseFrames);
    socket.on('error', () => { socket.destroy(); if (!ipcReady) connectIPC(attempt + 1); });
    socket.on('close', () => {
      if (ipc === socket) { ipc = null; ipcReady = false; setTimeout(() => connectIPC(0), 10000); }
    });
  }

  // ==========================================
  // MENU
  // ==========================================
  function buildCustomThemesSubmenu() {
    const keys = Object.keys(customThemes);
    if (keys.length === 0) {
      return [{ label: 'Aucun thème custom', enabled: false }];
    }
    return keys.map(id => ({
      label: customThemes[id].name,
      type: 'radio',
      checked: config.activeCustomTheme === id,
      click: () => applyCustomTheme(id)
    }));
  }

  function createCustomMenu() {
    const template = [
      {
        label: 'Navigation',
        submenu: [
          { label: 'Home', click: () => mainWindow.loadURL('https://music.nintendo.com/') },
          { label: 'Reload', role: 'reload' },
          { type: 'separator' },
          { label: 'Quit Client', click: () => { isAppQuitting = true; app.quit(); } }
        ]
      },
      {
        label: 'Appearance',
        submenu: [
          {
            label: 'Theme',
            submenu: [
              { label: 'Dark (Default)', type: 'radio', checked: config.theme === 'dark' && !config.activeCustomTheme, click: () => applyTheme('dark') },
              { label: 'Light', type: 'radio', checked: config.theme === 'light' && !config.activeCustomTheme, click: () => applyTheme('light') },
              { label: 'Deep Purple', type: 'radio', checked: config.theme === 'purple' && !config.activeCustomTheme, click: () => applyTheme('purple') },
              { type: 'separator' },
              {
                label: 'Custom Themes',
                submenu: buildCustomThemesSubmenu()
              },
              { type: 'separator' },
              { label: '🎨 Theme Editor...', click: () => createThemeEditorWindow() }
            ]
          },
          {
            label: 'Border Radius',
            submenu: [
              { label: 'Default (Site)', type: 'radio', checked: config.borderRadius === 'default', click: () => applyBorderRadius('default') },
              { label: 'Square (0px)', type: 'radio', checked: config.borderRadius === 0, click: () => applyBorderRadius(0) },
              { label: 'Subtle (4px)', type: 'radio', checked: config.borderRadius === 4, click: () => applyBorderRadius(4) },
              { label: 'Medium (8px)', type: 'radio', checked: config.borderRadius === 8, click: () => applyBorderRadius(8) },
              { label: 'Rounded (14px)', type: 'radio', checked: config.borderRadius === 14, click: () => applyBorderRadius(14) },
              { label: 'Extra (20px)', type: 'radio', checked: config.borderRadius === 20, click: () => applyBorderRadius(20) },
              { label: 'Extreme (30px)', type: 'radio', checked: config.borderRadius === 30, click: () => applyBorderRadius(30) },
              { label: 'Abusive (40px)', type: 'radio', checked: config.borderRadius === 40, click: () => applyBorderRadius(40) },
              { label: 'Pill / Max (50px)', type: 'radio', checked: config.borderRadius === 50, click: () => applyBorderRadius(50) }
            ]
          },
          { type: 'separator' },
          {
            label: 'Always on Top',
            type: 'checkbox',
            checked: config.alwaysOnTop,
            click: (item) => {
              config.alwaysOnTop = item.checked;
              mainWindow.setAlwaysOnTop(config.alwaysOnTop);
              saveConfig();
            }
          }
        ]
      },
      {
        label: 'Discord',
        submenu: [
          {
            label: 'Enable Rich Presence',
            type: 'checkbox',
            checked: config.rpcEnabled,
            click: (item) => {
              config.rpcEnabled = item.checked;
              saveConfig();
              if (config.rpcEnabled) connectIPC(0);
              else { clearActivity(); if (ipc) { ipc.destroy(); ipc = null; ipcReady = false; } }
            }
          },
          {
            label: 'Private Mode (Hide Track Info)',
            type: 'checkbox',
            checked: config.rpcPrivateMode,
            click: (item) => {
              config.rpcPrivateMode = item.checked;
              saveConfig();
              if (config.rpcEnabled) { lastActivityCache.title = null; pushActivity(); }
            }
          }
        ]
      },
      {
        label: 'System',
        submenu: [
          {
            label: 'Show Track Notifications',
            type: 'checkbox',
            checked: config.notificationsEnabled,
            click: (item) => {
              config.notificationsEnabled = item.checked;
              saveConfig();
            }
          },
          { type: 'separator' },
          {
            label: 'Run at Startup',
            type: 'checkbox',
            checked: config.autoStart,
            click: (item) => {
              config.autoStart = item.checked;
              app.setLoginItemSettings({ openAtLogin: config.autoStart, openAsHidden: config.startMinimized });
              saveConfig();
            }
          },
          {
            label: 'Start Minimized to Tray',
            type: 'checkbox',
            checked: config.startMinimized,
            click: (item) => {
              config.startMinimized = item.checked;
              app.setLoginItemSettings({ openAtLogin: config.autoStart, openAsHidden: config.startMinimized });
              saveConfig();
            }
          },
          { type: 'separator' },
          {
            label: 'Hardware Acceleration (Requires Restart)',
            type: 'checkbox',
            checked: config.hardwareAccel,
            click: (item) => {
              config.hardwareAccel = item.checked;
              saveConfig();
            }
          }
        ]
      }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  function rebuildMenu() {
    createCustomMenu();
  }

  // ==========================================
  // WINDOW & TRAY
  // ==========================================
  function createTray() {
    const iconPath = path.join(__dirname, 'icon.png');
    tray = new Tray(nativeImage.createFromPath(iconPath));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show / Hide', click: () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show() },
      { type: 'separator' },
      { label: 'Play / Pause', click: () => mainWindow.webContents.executeJavaScript(`var m = document.querySelector('audio, video'); if(m) m.paused ? m.play() : m.pause();`) },
      { label: 'Next Track', click: () => mainWindow.webContents.executeJavaScript(`navigator.mediaSession.metadata && navigator.mediaSession.playbackState ? window.dispatchEvent(new KeyboardEvent('keydown', {key: 'MediaTrackNext'})) : null;`) },
      { type: 'separator' },
      { label: '🎨 Theme Editor...', click: () => createThemeEditorWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => { isAppQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('Nintendo Music Client');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show());
  }

  function createWindow() {
    const nintendoSession = session.fromPartition('persist:nintendoMusic');
    const filter = { urls: ['*://*.google-analytics.com/*', '*://*.sentry.io/*'] };
    nintendoSession.webRequest.onBeforeRequest(filter, (details, callback) => { callback({ cancel: true }); });
    nintendoSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['User-Agent'] = customUserAgent;
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    mainWindow = new BrowserWindow({
      width: 1200, height: 800,
      autoHideMenuBar: true,
      alwaysOnTop: config.alwaysOnTop,
      transparent: false, hasShadow: true,
      show: false,
      webPreferences: {
        session: nintendoSession, nodeIntegration: false, contextIsolation: true,
        disableBlinkFeatures: 'WebAuthentication', plugins: true,
        backgroundThrottling: false, acceleratedRendering: true
      }
    });

    createCustomMenu();
    mainWindow.loadURL('https://music.nintendo.com/');

    mainWindow.once('ready-to-show', () => {
      if (!config.startMinimized) mainWindow.show();
    });

    mainWindow.on('close', (event) => {
      if (!isAppQuitting) { event.preventDefault(); mainWindow.hide(); }
    });

    mainWindow.webContents.on('media-started-playing', () => pushActivity());
    mainWindow.webContents.on('media-paused', () => pushActivity());

    let visualsApplied = false;
    mainWindow.webContents.on('did-finish-load', async () => {
      // Applique le thème actif
      if (config.activeCustomTheme && customThemes[config.activeCustomTheme]) {
        await applyCustomTheme(config.activeCustomTheme);
      } else {
        await applyTheme(config.theme);
      }
      await applyBorderRadius(config.borderRadius);

      // Réapplique le CSS custom si activé
      if (config.customCSSEnabled && config.customCSS) {
        await applyCustomCSS(config.customCSS);
      }

      if (visualsApplied) return;
      visualsApplied = true;

      setTimeout(() => {
        if (config.rpcEnabled) connectIPC(0);
        discordInterval = setInterval(pushActivity, 1000);
      }, 5000);
    });
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try { await components.whenReady(); } catch (e) { console.error("DRM Error:", e); }
    app.on('web-contents-created', (event, contents) => {
      contents.on('enter-html-full-screen', () => false);
    });
    createTray();
    createWindow();
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow) mainWindow.webContents.executeJavaScript(`var m = document.querySelector('audio, video'); if(m) { m.paused ? m.play() : m.pause(); }`);
    });
  });

  app.on('window-all-closed', () => {
    if (discordInterval) clearInterval(discordInterval);
    if (ipc) ipc.destroy();
    app.quit();
    setTimeout(() => process.exit(0), 100);
  });
}