import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: 'ttt0090.zo.computer',
  workspaceName: 'ttt0090',
  waitAfterEnterWorkspace: 60000,
  headless: true,
};

async function isVisible(locator, timeout = 3000) {
  try { await locator.waitFor({ state: 'visible', timeout }); return true; } catch { return false; }
}

async function safeScreenshot(page, path) {
  try { await page.screenshot({ path, fullPage: true }); console.log(`📸 已保存截图：${path}`); } catch { console.log(`⚠️ 截图失败：${path}`); }
}

async function clickSafely(locator, name) {
  try { await locator.click({ timeout: 5000 }); return true; } catch {
    try { await locator.click({ timeout: 5000, force: true }); return true; } catch { return false; }
  }
}

async function selectWorkspaceIfNeeded(page) {
  const domainText = page.getByText(CONFIG.workspaceDomain, { exact: false });
  const nameText = page.getByText(CONFIG.workspaceName, { exact: false });
  
  if (await isVisible(domainText, 5000)) {
    await clickSafely(domainText.first(), CONFIG.workspaceDomain);
    await page.waitForTimeout(8000);
    return true;
  }
  if (await isVisible(nameText, 5000)) {
    await clickSafely(nameText.first(), CONFIG.workspaceName);
    await page.waitForTimeout(8000);
    return true;
  }
  return false;
}

async function clickStartButtonIfExists(page) {
  const startButton = page.locator('text=Start machine').or(page.locator('text=Run')).or(page.locator('text=开始')).first();
  if (await isVisible(startButton, 8000)) {
    await startButton.click();
    await page.waitForTimeout(10000);
    return true;
  }
  return false;
}

async function run() {
  const activationUrl = process.argv[2];
  if (!activationUrl) { console.error('❌ 没有传入激活链接'); process.exit(1); }

  console.log('🚀 启动 CloakBrowser...');
  const browser = await launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  try {
    console.log('🌐 打开激活链接...');
    await page.goto(activationUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    await safeScreenshot(page, 'activate-open.png');

    const selectedWorkspace = await selectWorkspaceIfNeeded(page);
    if (selectedWorkspace) {
      await page.waitForTimeout(CONFIG.waitAfterEnterWorkspace);
      await clickStartButtonIfExists(page);
      await safeScreenshot(page, 'result.png');
      console.log('✅ 激活流程完成');
    } else {
      await clickStartButtonIfExists(page);
      await safeScreenshot(page, 'result.png');
      console.log('✅ 脚本结束');
    }
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
