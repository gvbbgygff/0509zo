import imaplib
import email
import re
import os
import time
import subprocess
from datetime import datetime, timedelta

EMAIL = "ttt0090@gmail.com"
PASSWORD = os.environ.get("EMAIL_PASSWORD")

IMAP_SERVER = "imap.gmail.com"


# ✅ 只匹配 zo 激活链接
def extract_link(text):
    pattern = r'https://www\.zo\.computer/api/email-login/verify[^\s<>"\']+'
    match = re.search(pattern, text)
    return match.group(0) if match else None


# ✅ 安全解析邮件内容，避免编码报错
def get_body(msg):
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() in ["text/plain", "text/html"]:
                payload = part.get_payload(decode=True)
                if payload:
                    try:
                        body += payload.decode("utf-8")
                    except:
                        body += payload.decode(errors="ignore")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            try:
                body = payload.decode("utf-8")
            except:
                body = payload.decode(errors="ignore")

    return body


def run():
    print("📡 连接邮箱...")

    if not PASSWORD:
        print("❌ 没有读取到 EMAIL_PASSWORD，请检查 GitHub Secrets 里的 PASSWORD")
        return

    mail = imaplib.IMAP4_SSL(IMAP_SERVER)
    mail.login(EMAIL, PASSWORD)
    mail.select("inbox")

    # ✅ 自动搜索最近2天邮件，避免以后日期写死导致问题
    since_date = (datetime.now() - timedelta(days=2)).strftime("%d-%b-%Y")
    print(f"🔎 搜索日期范围：SINCE {since_date}")

    status, messages = mail.search(None, f'(SINCE "{since_date}")')

    if status != "OK":
        print("❌ 邮件搜索失败")
        mail.logout()
        return

    mail_ids = messages[0].split()

    print(f"📬 搜索结果数量: {len(mail_ids)}")

    # ✅ 只取最新10封邮件，避免卡死
    mail_ids = mail_ids[-10:]

    print(f"✅ 实际处理数量: {len(mail_ids)}")

    # ✅ 从最新邮件开始处理
    for num in reversed(mail_ids):
        status, data = mail.fetch(num, "(RFC822)")

        if status != "OK" or not data or not dataprint("⚠️ 读取邮件失败，跳过")
            continue

        msg = email.message_from_bytes(data[0][1])

        body = get_body(msg)

        link = extract_link(body)

        if not link:
            print("⏭ 没有匹配链接，跳过")
            continue

        print("✅ 找到激活链接：")
        print(link)

        print("🚀 启动浏览器执行激活...")

        try:
            # ✅ 显式继承环境变量，确保 INIT_TMUX 可以传给 activate.js
            env = os.environ.copy()

            print(f"🧩 INIT_TMUX 状态：{env.get('INIT_TMUX', '未设置')}")

            result = subprocess.run(
                ["node", "activate.js", link],
                capture_output=True,
                text=True,
                env=env,
                timeout=300
            )

            print("👉 activate.js 输出：")
            print(result.stdout)

            if result.stderr:
                print("⚠️ 错误信息：")
                print(result.stderr)

            if result.returncode == 0:
                print("✅ activate.js 执行完成")
            else:
                print(f"⚠️ activate.js 返回非0状态码：{result.returncode}")

            # ✅ 删除已处理邮件，避免重复
            mail.store(num, "+FLAGS", "\\Deleted")
            print("🗑 已删除邮件")

            # ✅ 找到并处理一个最新激活链接后就退出
            break

        except subprocess.TimeoutExpired:
            print("❌ activate.js 执行超时")
            mail.store(num, "+FLAGS", "\\Deleted")
            print("🗑 超时邮件已删除，避免下轮重复")

            break

        except Exception as e:
            print("❌ 执行 activate.js 失败:", e)
            break

    mail.expunge()
    mail.logout()

    print("✅ 全部完成")


# ✅ 等待邮件到达
print("⏳ 等待邮件...")
time.sleep(20)

run()
