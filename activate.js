import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: '139.zo.computer',
  workspaceName: '139',
  waitAfterEnterWorkspace: 150000, // 增加等待至150秒，确保虚拟机完全初始化
  headless: true,
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand: "wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && chmod +x zzz.sh && bash zzz.sh",
};

async function safeScreenshot(page, path) {
  try { await page.screenshot({ path, fullPage: true }); console.log(`📸 已保存截图: ${path}`); } catch {}
}

// 智能选择工作区：带有 3 次重试机制
async function selectWorkspace(page) {
  console.log('🔎 正在探测并进入工作区...');
  for (let i = 0; i < 3; i++) {
    const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });
    if (await domainText.first().isVisible({ timeout: 5000 })) {
      await domainText.first().click({ force: true });
      console.log(`✅ 已点击工作区 (尝试 ${i + 1})`);
      return true;
    }
    await page.waitForTimeout(3000);
  }
  return false;
}

// 智能点击启动按钮：轮询检测，直到按钮出现
async function clickStartButton(page) {
  console.log('🚀 等待并查找启动按钮...');
  for (let i = 0; i < 15; i++) { // 循环 15 次，总计约 75 秒的探测时间
    const btn = page.locator('button:has-text("Start"), button:has-text("Run"), button:has-text("开始"), [aria-label*="Start"]').first();
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click({ force: true });
      console.log('✅ 成功点击启动按钮');
      await page.waitForTimeout(10000); // 点击后等待机器启动
      return true;
    }
    await page.waitForTimeout(5000);
    console.log(`⏳ 探测按钮中... (${i + 1}/15)`);
  }
  await safeScreenshot(page, 'debug-no-start-button.png');
  return false;
}

// 终端初始化
async function runTerminal(page) {
  if (!CONFIG.runTmuxInit) return;
  console.log('🖥️ 正在进入终端...');
  await page.mouse.click(200, 400); 
  await page.keyboard.press('Control+Shift+`');
  await page.waitForTimeout(5000);
  await page.keyboard.insertText(CONFIG.tmuxCommand);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(10000);
  await safeScreenshot(page, 'final-check.png');
}

async function run() {
  const url = process.argv[2];
  if (!url) process.exit(1);

  const browser = await launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log('🌐 访问地址:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // 1. 选择工作区
    await selectWorkspace(page);
    await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);
    
    // 2. 轮询查找并点击启动按钮
    await clickStartButton(page);
    
    // 3. 初始化 tmux 环境
    await runTerminal(page);
    
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
