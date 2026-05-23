import { launch } from 'cloakbrowser';

async function runOnce() {
  const browser = await launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("🚀 开始执行：", new Date().toLocaleString());
    await page.goto('https://www.zo.computer/signup?handle=ttt0090', { waitUntil: 'networkidle' });
    await page.click('text="Email me a link"');
    const emailInput = page.locator('input');
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('ttt0090@gmail.com');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'result.png' });
    console.log("✅ 邮件发送成功");
  } catch (err) {
    console.error("❌ 执行失败:", err);
    await page.screenshot({ path: 'error.png' });
  } finally {
    await browser.close();
  }
}

runOnce();
