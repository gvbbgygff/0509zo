import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: 'ttt0090.zo.computer',
  workspaceName: 'ttt0090',
  waitAfterEnterWorkspace: 120000, // 延长到120秒，确保环境彻底就绪
  headless: true,
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand: "cd $HOME && wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && bash zzz.sh",
};

async function safeScreenshot(page, path) {
  try { await page.screenshot({ path, fullPage: true }); console.log(`📸 截图保存: ${path}`); } catch {}
}

async function openTerminalAndRunTmux(page) {
  if (!CONFIG.runTmuxInit) return;
  console.log('🖥️ 准备执行 Tmux...');
  
  // 1. 强制获取焦点：点击页面中心
  await page.mouse.click(200, 400);
  await page.waitForTimeout(2000);

  // 2. 使用更稳妥的快捷键触发
  await page.keyboard.press('Control+Shift+`');
  await page.waitForTimeout(5000);
  
  await safeScreenshot(page, 'after-terminal-shortcut.png');

  // 3. 直接输入命令，不需要先进入 tmux 模式，确保命令在 shell 中执行
  console.log('⌨️ 输入执行命令...');
  await page.keyboard.insertText(CONFIG.tmuxCommand);
  await page.keyboard.press('Enter');
  
  await page.waitForTimeout(5000);
  await safeScreenshot(page, 'after-command-executed.png');
  console.log('✅ 命令输入完成');
}

async function run() {
  const url = process.argv[2];
  const browser = await launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(10000); // 增加等待，确保页面 JS 初始化完毕
    
    // 自动选择工作区
    const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });
    if (await domainText.isVisible({ timeout: 5000 })) await domainText.first().click();
    
    await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);
    
    // 执行终端操作
    await openTerminalAndRunTmux(page);
    
    console.log('✅ 流程结束');
  } catch (err) {
    console.error('❌ 错误:', err);
    await safeScreenshot(page, 'error-debug.png');
  } finally {
    await browser.close();
  }
}

run();
