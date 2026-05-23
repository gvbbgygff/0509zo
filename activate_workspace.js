import { launch } from 'cloakbrowser';
import fs from 'fs';

const CONFIG = {
  workspaceDomain: '139.zo.computer', // 请确认这是你当前的正确域名
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand: "wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && chmod +x zzz.sh && bash zzz.sh",
};

async function safeScreenshot(page, path) {
  try { await page.screenshot({ path, fullPage: true }); } catch {}
}

async function run() {
  const url = process.argv[2];
  if (!url) process.exit(1);

  // 1. 读取本地上传的 cookies.json
  let storageState = undefined;
  if (fs.existsSync('cookies.json')) {
    console.log('🍪 检测到 cookies.json，正在加载登录会话...');
    storageState = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
  } else {
    console.log('⚠️ 未找到 cookies.json，可能无法跳过验证码。');
  }

  const browser = await launch({ headless: true });
  
  // 2. 使用 storageState 直接注入会话
  const context = await browser.newContext({
    storageState: storageState,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();

  try {
    console.log('🌐 正在访问:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

    // 3. 此时应该直接进入工作区列表，不需要等待验证码了
    console.log(`🔎 正在查找域名: ${CONFIG.workspaceDomain}`);
    const domain = page.locator(`text="${CONFIG.workspaceDomain}"`).first();
    
    // 等待域名出现并点击
    await domain.waitFor({ state: 'visible', timeout: 30000 });
    await domain.click({ force: true });
    
    console.log('✅ 域名已点击，等待系统自动启动...');
    await page.waitForTimeout(20000);

    // 4. 执行终端初始化
    if (CONFIG.runTmuxInit) {
      console.log('🖥️ 执行终端初始化...');
      await page.keyboard.press('Control+Shift+`');
      await page.waitForTimeout(5000);
      await page.keyboard.insertText(CONFIG.tmuxCommand);
      await page.keyboard.press('Enter');
    }

    await safeScreenshot(page, 'result.png');
    console.log('✅ 流程执行完成');
  } catch (err) {
    console.error('❌ 执行失败:', err);
    await safeScreenshot(page, 'error-final.png');
  } finally {
    await browser.close();
  }
}

run();
