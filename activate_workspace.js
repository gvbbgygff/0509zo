const { chromium } = require('playwright');

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
    await locator.waitFor({
      state: 'visible',
      timeout,
    });
    return true;
  } catch {
    return false;
  }
}

async function safeScreenshot(page, path) {
  try {
    await page.screenshot({
      path,
      fullPage: true,
    });
    console.log(`📸 已保存截图：${path}`);
  } catch {
    console.log(`⚠️ 截图失败：${path}`);
  }
}

async function clickSafely(locator, name) {
  try {
    console.log(`👉 尝试普通点击：${name}`);
    await locator.click({
      timeout: 5000,
    });
    return true;
  } catch {
    console.log(`⚠️ 普通点击失败：${name}`);
  }

  try {
    console.log(`👉 尝试强制点击：${name}`);
    await locator.click({
      timeout: 5000,
      force: true,
    });
    return true;
  } catch {
    console.log(`⚠️ 强制点击失败：${name}`);
  }

  return false;
}

async function selectWorkspaceIfNeeded(page) {
  console.log('🔎 检查是否出现工作区选择页面...');

  const title = page.getByText('Your Zo Computers', { exact: false });
  const hint = page.getByText('Choose a workspace to continue', { exact: false });
  const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });
  const nameText = page.getByText(CONFIG.workspaceName, { exact: false });

  const hasWorkspacePage =
    await isVisible(title, 5000) ||
    await isVisible(hint, 5000) ||
    await isVisible(domainText, 5000) ||
    await isVisible(nameText, 5000);

  if (!hasWorkspacePage) {
    console.log('ℹ️ 未检测到工作区选择页面');
    return false;
  }

  console.log('🏢 检测到工作区选择页面');
  console.log(`🎯 准备点击工作区：${CONFIG.workspaceDomain}`);

  await safeScreenshot(page, 'workspace-before-click.png');

  if (await isVisible(domainText, 5000)) {
    console.log(`✅ 页面上看到了完整域名：${CONFIG.workspaceDomain}`);

    const clickedDomain = await clickSafely(domainText.first(), CONFIG.workspaceDomain);

    if (clickedDomain) {
      console.log(`✅ 已点击完整域名：${CONFIG.workspaceDomain}`);
      await page.waitForTimeout(8000);
      await safeScreenshot(page, 'workspace-after-click.png');
      return true;
    }
  }

  if (await isVisible(nameText, 5000)) {
    console.log(`✅ 页面上看到了工作区名称：${CONFIG.workspaceName}`);

    const clickedName = await clickSafely(nameText.first(), CONFIG.workspaceName);

    if (clickedName) {
      console.log(`✅ 已点击工作区名称：${CONFIG.workspaceName}`);
      await page.waitForTimeout(8000);
      await safeScreenshot(page, 'workspace-after-click.png');
      return true;
    }
  }

  try {
    console.log('👉 尝试用 JS 查找并点击工作区元素...');

    const jsClicked = await page.evaluate((domain) => {
      const all = Array.from(document.querySelectorAll('*'));

      const target = all.find((el) => {
        const text = el.textContent || '';
        return text.includes(domain);
      });

      if (!target) {
        return false;
      }

      let el = target;

      for (let i = 0; i < 8; i++) {
        if (!el) break;

        const rect = el.getBoundingClientRect();

        if (rect.width > 200 && rect.height > 40) {
          el.click();
          return true;
        }

        el = el.parentElement;
      }

      target.click();
      return true;
    }, CONFIG.workspaceDomain);

    if (jsClicked) {
      console.log('✅ JS 已点击工作区元素');
      await page.waitForTimeout(8000);
      await safeScreenshot(page, 'workspace-after-js-click.png');
      return true;
    }

    console.log('⚠️ JS 没找到完整域名元素');
  } catch {
    console.log('⚠️ JS 点击工作区失败');
  }

  try {
    console.log('👉 尝试坐标点击工作区卡片...');

    await page.mouse.click(640, 350);

    console.log('✅ 已执行坐标点击工作区卡片');
    await page.waitForTimeout(8000);
    await safeScreenshot(page, 'workspace-after-coordinate-click.png');

    return true;
  } catch {
    console.log('⚠️ 坐标点击失败');
  }

  console.log('❌ 检测到工作区页面，但未能点击工作区');
  await safeScreenshot(page, 'workspace-click-failed.png');

  return false;
}

async function clickStartButtonIfExists(page) {
  console.log('🔎 检查是否还有启动按钮...');

  const startButton = page
    .locator('text=Start machine')
    .or(page.locator('text=Run'))
    .or(page.locator('text=Start'))
    .or(page.locator('text=开始'))
    .or(page.locator('[aria-label*="Start"]'))
    .or(page.locator('[title*="Start"]'))
    .first();

  const hasStartButton = await isVisible(startButton, 10000);

  if (!hasStartButton) {
    console.log('ℹ️ 未发现 Start machine / Run / 开始 按钮');
    console.log('ℹ️ 可能机器已经自动启动');
    return false;
  }

  console.log('🚀 发现启动按钮，准备点击...');
  await clickSafely(startButton, 'Start machine / Run');

  await page.waitForTimeout(10000);

  console.log('✅ 已点击启动按钮');
  await safeScreenshot(page, 'after-start-click.png');

  return true;
}

async function openTerminalAndRunTmux(page) {
  if (!CONFIG.runTmuxInit) {
    console.log('ℹ️ 当前不是第一次循环，跳过 tmux 初始化');
    return false;
  }

  console.log('🖥️ 检测到 INIT_TMUX=1，准备打开终端并运行 tmux 命令...');
  await safeScreenshot(page, 'before-terminal-init.png');

  try {
    const terminalButton = page
      .getByText('Terminal', { exact: false })
      .or(page.getByText('终端', { exact: false }))
      .or(page.getByText('New Terminal', { exact: false }))
      .or(page.getByText('Open Terminal', { exact: false }))
      .or(page.getByText('Console', { exact: false }))
      .or(page.locator('[aria-label*="Terminal"]'))
      .or(page.locator('[title*="Terminal"]'))
      .or(page.locator('[aria-label*="terminal"]'))
      .or(page.locator('[title*="terminal"]'))
      .first();

    if (await isVisible(terminalButton, 10000)) {
      console.log('✅ 找到 Terminal / 终端 按钮，尝试点击...');
      await clickSafely(terminalButton, 'Terminal');
      await page.waitForTimeout(8000);
    } else {
      console.log('⚠️ 没找到明显 Terminal 按钮，尝试快捷键打开终端...');

      await page.keyboard.press('Control+Shift+`');
      await page.waitForTimeout(5000);

      await page.keyboard.press('Control+`');
      await page.waitForTimeout(5000);

      console.log('👉 尝试 F1 命令面板打开终端...');
      await page.keyboard.press('F1');
      await page.waitForTimeout(2000);
      await page.keyboard.insertText('Terminal: Create New Terminal');
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(8000);
    }

    await safeScreenshot(page, 'after-open-terminal.png');

    let focused = false;

    const terminalSelectors = [
      '.xterm-helper-textarea',
      '.xterm textarea',
      '.xterm',
      '.xterm-screen',
      '[class*="xterm"]',
      '[class*="terminal"]',
      '[class*="Terminal"]',
      'textarea',
      '[contenteditable="true"]'
    ];

    for (const selector of terminalSelectors) {
      try {
        const loc = page.locator(selector).first();
        const count = await loc.count();

        if (count > 0) {
          console.log(`✅ 找到可能的终端区域：${selector}`);
          await loc.click({
            timeout: 5000,
            force: true,
          });
          focused = true;
          await page.waitForTimeout(1000);
          break;
        }
      } catch {
        console.log(`⚠️ 聚焦失败：${selector}`);
      }
    }

    if (!focused) {
      console.log('⚠️ 没找到终端输入区域，尝试点击页面底部多个位置...');

      await page.mouse.click(640, 720);
      await page.waitForTimeout(1000);

      await page.mouse.click(640, 780);
      await page.waitForTimeout(1000);

      await page.mouse.click(640, 840);
      await page.waitForTimeout(1000);
    }

    await page.keyboard.press('Control+A');
    await page.waitForTimeout(500);

    console.log(`⌨️ 输入命令：${CONFIG.tmuxCommand}`);

    await page.keyboard.insertText(CONFIG.tmuxCommand);
    await page.keyboard.press('Enter');

    console.log('✅ tmux + zzz.sh 命令已发送');

    await page.waitForTimeout(10000);
    await safeScreenshot(page, 'after-tmux-command.png');

    return true;
  } catch (err) {
    console.log('⚠️ 打开终端或执行 tmux 命令失败:', err.message);
    await safeScreenshot(page, 'terminal-init-failed.png');
    return false;
  }
}

async function run() {
  const activationUrl = process.argv[2];

  if (!activationUrl) {
    console.error('❌ 没有传入激活链接');
    process.exit(1);
  }

  console.log('🚀 启动浏览器执行激活...');
  console.log('🌐 打开激活链接...');
  console.log(`🧩 INIT_TMUX 状态：${CONFIG.runTmuxInit ? '开启' : '关闭'}`);

  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 900,
    },
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('🌐 打开激活链接...');

    await page.goto(activationUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForTimeout(5000);
    await safeScreenshot(page, 'activate-open.png');

    const selectedWorkspace = await selectWorkspaceIfNeeded(page);

    if (selectedWorkspace) {
      console.log('✅ 已点击工作区');

      console.log(`⏳ 等待 ${CONFIG.waitAfterEnterWorkspace / 1000} 秒，让网站自动处理机器启动...`);
      await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);

      await clickStartButtonIfExists(page);

      console.log(`⏳ 启动按钮处理完成，继续等待 ${CONFIG.waitAfterStartMachine / 1000} 秒...`);
      await page.waitForTimeout(CONFIG.waitAfterStartMachine);

      if (CONFIG.runTmuxInit) {
        await openTerminalAndRunTmux(page);
      } else {
        console.log('ℹ️ 当前不是第一次循环，不执行终端 tmux 初始化');
      }

      await safeScreenshot(page, 'result.png');

      console.log('✅ 激活流程完成');
      return;
    }

    console.log('ℹ️ 未出现工作区选择页，尝试兼容旧启动按钮逻辑');

    const clickedStart = await clickStartButtonIfExists(page);

    if (clickedStart) {
      console.log(`⏳ 启动后等待 ${CONFIG.waitAfterStartMachine / 1000} 秒...`);
      await page.waitForTimeout(CONFIG.waitAfterStartMachine);

      if (CONFIG.runTmuxInit) {
        await openTerminalAndRunTmux(page);
      }

      await safeScreenshot(page, 'result.png');
      console.log('✅ 旧页面启动流程完成');
      return;
    }

    if (CONFIG.runTmuxInit) {
      console.log('🖥️ 未检测到工作区选择页，但当前是第一次循环，尝试终端 tmux 初始化...');
      await openTerminalAndRunTmux(page);
    }

    console.log('⚠️ 未发现工作区，也未发现启动按钮');
    console.log('⚠️ 可能已经自动完成，保存截图供检查');

    await safeScreenshot(page, 'unknown-page.png');

    console.log('✅ 脚本结束，不再因为找不到按钮而失败');
  } catch (err) {
    console.error('❌ 激活失败:', err);

    await safeScreenshot(page, 'activate-error.png');

    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('🔚 浏览器关闭');
  }
}

run();
