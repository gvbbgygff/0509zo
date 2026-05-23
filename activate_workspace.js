import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: 'ttt0090.zo.computer',
  workspaceName: 'ttt0090',
  waitAfterEnterWorkspace: 90000,
  waitAfterStartMachine: 30000,
  headless: true,
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand: "su - ttt0090 -c 'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main; tmux send-keys -t main \"cd \\$HOME && wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && bash zzz.sh\" C-m'",
};

async function isVisible(locator, timeout = 3000) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch { return false; }
}

async function safeScreenshot(page, path) {
  try {
    await page.screenshot({ path, fullPage: true });
    console.log(`📸 已保存截图：${path}`);
  } catch { console.log(`⚠️ 截图失败：${path}`); }
}

async function clickSafely(locator, name) {
  try { await locator.click({ timeout: 5000 }); return true; } catch {
    try { await locator.click({ timeout: 5000, force: true }); return true; } catch { return false; }
  }
}

async function selectWorkspaceIfNeeded(page) {
  const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });
  if (await isVisible(domainText, 5000)) {
    await clickSafely(domainText.first(), CONFIG.workspaceDomain);
    await page.waitForTimeout(8000);
    return true;
  }
  return false;
}

async function clickStartButtonIfExists(page) {
  const startButton = page.locator('text=Start machine').or(page.locator('text=Run')).first();
  if (await isVisible(startButton, 10000)) {
    await clickSafely(startButton, 'Start');
    await page.waitForTimeout(10000);
    return true;
  }
  return false;
}

async function openTerminalAndRunTmux(page) {
  if (!CONFIG.runTmuxInit) return;
  console.log('🖥️ 执行终端 tmux 命令...');
  await page.keyboard.press('Control+Shift+`');
  await page.waitForTimeout(5000);
  await page.keyboard.insertText(CONFIG.tmuxCommand);
  await page.keyboard.press('Enter');
}

// 主程序入口
async function run() {
  const url = process.argv[2];
  if (!url) { console.error("❌ 错误：未提供激活 URL"); process.exit(1); }

  console.log("🚀 启动 CloakBrowser...");
  const browser = await launch({ headless: CONFIG.headless });
  const page = await browser.newPage();

  try {
    console.log(`🌐 访问地址: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });

    await selectWorkspaceIfNeeded(page);
    await clickStartButtonIfExists(page);
    
    console.log(`⌛ 等待加载...`);
    await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);

    await openTerminalAndRunTmux(page);
    console.log("✅ 全部任务执行完成");
  } catch (err) {
    console.error("❌ 执行出错:", err);
    await safeScreenshot(page, 'error-final.png');
  } finally {
    await browser.close();
  }
}

run();
