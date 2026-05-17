const { chromium } = require('playwright');

const CONFIG = {
  workspaceDomain: 'ttt0090.zo.computer',
  workspaceName: 'ttt0090',

  waitAfterEnterWorkspace: 60000,

  headless: true,
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
  } catch (err) {
    console.log(`⚠️ 普通点击失败：${name}`);
  }

  try {
    console.log(`👉 尝试强制点击：${name}`);
    await locator.click({
      timeout: 5000,
      force: true,
    });
    return true;
  } catch (err) {
    console.log(`⚠️ 强制点击失败：${name}`);
  }

  return false;
}

/**
 * 新版工作区点击逻辑
 */
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

  /**
   * 第一种：
   * 直接点击完整域名文字。
   */
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

  /**
   * 第二种：
   * 点击工作区名称 ttt0090。
   */
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

  /**
   * 第三种：
   * 用 JavaScript 找包含 ttt0090.zo.computer 的元素，然后点击最近的父级。
   */
  try {
    console.log('👉 尝试用 JS 查找并点击工作区元素...');

    const jsClicked = await page.evaluate((domain) => {
      const all = Array.from(document.querySelectorAll('*'));

      const target = all.find(el => {
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
  } catch (err) {
    console.log('⚠️ JS 点击工作区失败');
  }

  /**
   * 第四种：
   * 坐标点击。
   *
   * 根据你发的手机截图：
   * 工作区卡片在页面中部偏上。
   * viewport 是 390 x 844。
   * 卡片大约位置：
   * x = 195
   * y = 300
   */
  try {
    console.log('👉 尝试坐标点击工作区卡片...');

    await page.mouse.click(195, 300);

    console.log('✅ 已执行坐标点击工作区卡片');

    await page.waitForTimeout(8000);
    await safeScreenshot(page, 'workspace-after-coordinate-click.png');

    return true;
  } catch (err) {
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
    .or(page.locator('text=开始'))
    .first();

  const hasStartButton = await isVisible(startButton, 8000);

  if (!hasStartButton) {
    console.log('ℹ️ 未发现 Start machine / Run / 开始 按钮');
    console.log('ℹ️ 新版页面可能进入工作区后自动启动，不再强制点击按钮');
    return false;
  }

  console.log('🚀 发现启动按钮，准备点击...');
  await startButton.click();

  await page.waitForTimeout(10000);

  console.log('✅ 已点击启动按钮');
  await safeScreenshot(page, 'after-start-click.png');

  return true;
}

async function run() {
  const activationUrl = process.argv[2];

  if (!activationUrl) {
    console.error('❌ 没有传入激活链接');
    process.exit(1);
  }

  console.log('🚀 启动浏览器执行激活...');
  console.log('🌐 打开激活链接...');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
  });

  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844,
    },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  try {
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

      await safeScreenshot(page, 'result.png');

      console.log('✅ 激活流程完成');
      return;
    }

    console.log('ℹ️ 未出现工作区选择页，尝试兼容旧启动按钮逻辑');

    const clickedStart = await clickStartButtonIfExists(page);

    if (clickedStart) {
      await safeScreenshot(page, 'result.png');
      console.log('✅ 旧页面启动流程完成');
      return;
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
