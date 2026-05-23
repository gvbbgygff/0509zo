import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: '139.zo.computer',
  workspaceName: '139',
  // 大幅增加等待时间，防止由于机器初始化慢导致按钮未出现
  waitAfterEnterWorkspace: 180000, 
  headless: true,
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand: "wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && chmod +x zzz.sh && bash zzz.sh",
};

async function safeScreenshot(page, path) {
  try { await page.screenshot({ path, fullPage: true }); } catch {}
}

async function selectWorkspace(page) {
  console.log(`🔎 正在精准查找并选择域名: ${CONFIG.workspaceDomain}`);
  for (let i = 0; i < 5; i++) {
    const target = page.locator(`text="${CONFIG.workspaceDomain}"`).first();
    if (await target.isVisible({ timeout: 5000 })) {
      await target.scrollIntoViewIfNeeded();
      await target.evaluate(el => el.click());
      console.log('✅ 域名点击成功，等待工作区环境加载...');
      return true;
    }
    await page.waitForTimeout(5000);
  }
  return false;
}

async function clickStartButton(page) {
  console.log('🚀 正在执行精准探测启动按钮策略...');
  // 严格限制选择器，仅定位交互按钮，避免误点段落文字
  const btnSelector = 'button:has-text("Start"), button:has-text("Run"), button:has-text("开始"), [role="button"]:has-text("Start"), [aria-label*="Start"]';
  
  for (let i = 0; i < 15; i++) {
    const btn = page.locator(btnSelector).first();
    if (await btn.isVisible({ timeout: 3000 })) {
      const tagName = await btn.evaluate(el => el.tagName);
      // 过滤非交互式元素
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
  await safeScreenshot(page, 'debug-button-fail.png');
  return false;
}

async function run() {
  const url = process.argv[2];
  if (!url) process.exit(1);

  const browser = await launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  // 关键防检测：抹除自动化 webdriver 标识
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    console.log('🌐 正在访问目标页面...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    // 1. 模拟真人：随机等待
    await page.waitForTimeout(Math.floor(Math.random() * 3000) + 2000);
    
    // 2. 选择工作区
    await selectWorkspace(page);
    await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);
    
    // 3. 点击启动按钮
    await clickStartButton(page);
    
    // 4. 执行 tmux 初始化
    if (CONFIG.runTmuxInit) {
      console.log('🖥️ 执行终端初始化...');
      await page.mouse.click(200, 400);
      await page.keyboard.press('Control+Shift+`');
      await page.waitForTimeout(5000);
      await page.keyboard.insertText(CONFIG.tmuxCommand);
      await page.keyboard.press('Enter');
    }
    
    await safeScreenshot(page, 'result.png');
    console.log('✅ 激活流程顺利结束');
  } catch (err) {
    console.error('❌ 流程执行异常:', err);
    await safeScreenshot(page, 'error-final.png');
  } finally {
    await browser.close();
  }
}

run();
