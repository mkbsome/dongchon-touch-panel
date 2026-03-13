const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

const isDev = !app.isPackaged;

// 경로 설정
const backendPath = isDev
  ? path.join(__dirname, '..', 'backend-dist', 'backend.exe')
  : path.join(process.resourcesPath, 'backend', 'backend.exe');

const frontendPath = isDev
  ? path.join(__dirname, '..', 'out', 'index.html')
  : path.join(process.resourcesPath, 'frontend', 'index.html');

function startBackend() {
  console.log('Starting backend server...');
  console.log('Backend path:', backendPath);

  try {
    backendProcess = spawn(backendPath, [], {
      cwd: path.dirname(backendPath),
      stdio: 'pipe',
      windowsHide: false
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
  } catch (error) {
    console.error('Backend start error:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: isDev
      ? path.join(__dirname, '..', 'assets', 'icon.ico')
      : path.join(process.resourcesPath, 'icon.ico'),
    title: '동촌에프에스 절임 조건 입력기',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false  // Allow loading local files
    },
    autoHideMenuBar: true,
    show: false  // 로딩 완료 후 표시
  });

  // 스플래시 대기 후 메인 페이지 로드
  console.log('Frontend path:', frontendPath);

  // 백엔드 시작 대기 후 로드
  setTimeout(() => {
    mainWindow.loadFile(frontendPath);
  }, 2000);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

// 예외 처리
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
