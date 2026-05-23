import imaplib
import email
import re
import os
import time
import html
import random
import requests
from datetime import datetime, timedelta

EMAIL = "ttt0090@gmail.com"
PASSWORD = os.environ.get("EMAIL_PASSWORD")

IMAP_SERVER = "imap.gmail.com"


def extract_link(text):
    if not text:
        return None

    text = html.unescape(text)

    pattern = r'https://www\.zo\.computer/api/email-login/verify[^\s<>"\']+'
    matches = re.findall(pattern, text)

    if not matches:
        return None

    link = matches[0]
    link = link.replace("&amp;", "&")
    link = link.strip()

    return link


def get_body(msg):
    body = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()

            if content_type in ["text/plain", "text/html"]:
                payload = part.get_payload(decode=True)

                if payload:
                    charset = part.get_content_charset() or "utf-8"

                    try:
                        body += payload.decode(charset, errors="ignore")
                    except Exception:
                        body += payload.decode("utf-8", errors="ignore")
    else:
        payload = msg.get_payload(decode=True)

        if payload:
            charset = msg.get_content_charset() or "utf-8"

            try:
                body += payload.decode(charset, errors="ignore")
            except Exception:
                body += payload.decode("utf-8", errors="ignore")

    return body


def run():
    print("📡 连接邮箱...")

    if not PASSWORD:
        print("❌ 没有读取到 EMAIL_PASSWORD，请检查 GitHub Secrets")
        return

    mail = imaplib.IMAP4_SSL(IMAP_SERVER)

    try:
        mail.login(EMAIL, PASSWORD)
        mail.select("inbox")

        since_date = (datetime.now() - timedelta(days=3)).strftime("%d-%b-%Y")
        print(f"🔎 搜索日期范围：SINCE {since_date}")

        status, messages = mail.search(None, f'(SINCE "{since_date}")')

        if status != "OK":
            print("❌ 邮件搜索失败")
            return

        mail_ids = messages[0].split()

        print(f"📬 搜索结果数量: {len(mail_ids)}")

        if not mail_ids:
            print("⚠️ 邮箱里没有搜索到最近邮件")
            return

        mail_ids = mail_ids[-50:]
        print(f"✅ 实际处理数量: {len(mail_ids)}")

        found_link = False

        for num in reversed(mail_ids):
            status, data = mail.fetch(num, "(RFC822)")

            if status != "OK" or not data:
                print("⚠️ 读取邮件失败，跳过")
                continue

            if not isinstance(data[0], tuple):
                print("⚠️ 邮件数据格式异常，跳过")
                continue

            msg = email.message_from_bytes(data[0][1])

            subject = msg.get("Subject", "")
            from_addr = msg.get("From", "")

            print("--------------------------------")
            print(f"📧 From: {from_addr}")
            print(f"📧 Subject: {subject}")

            body = get_body(msg)
            link = extract_link(body)

            if not link:
                print("⏭ 没有匹配链接，跳过")
                continue

            found_link = True

            print("✅ 找到激活链接：")
            print(link)

            # ✅ 随机等待（避免风控）
            wait_time = random.uniform(20, 60)
            print(f"⏳ 等待 {wait_time:.1f} 秒")
            time.sleep(wait_time)

            print("🚀 使用接口激活...")

            try:
                headers = {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "*/*",
                    "Connection": "keep-alive",
                    "Referer": "https://www.zo.computer/"
                }

                success = False

                # ✅ 最多尝试3次
                for i in range(3):
                    print(f"👉 尝试第 {i+1} 次")

                    try:
                        resp = requests.get(
                            link,
                            headers=headers,
                            timeout=20,
                            allow_redirects=True
                        )

                        print("状态码:", resp.status_code)

                        if resp.status_code in [200, 204, 302]:
                            print("✅ 激活成功")
                            success = True
                            break

                        if "cloudflare" in resp.text.lower():
                            print("⚠️ 遇到 Cloudflare")
                            break

                    except Exception as e:
                        print("❌ 请求异常:", e)

                    time.sleep(3)

                if success:
                    mail.store(num, "+FLAGS", "\\Deleted")
                    print("🗑 已删除已处理邮件")
                else:
                    print("⚠️ 激活失败，本封邮件保留")

                break

            except Exception as e:
                print("❌ 激活流程失败:", e)
                print("⚠️ 邮件不删除，等待下次重试")
                break

        if not found_link:
            print("⚠️ 没有找到新的激活链接")

        mail.expunge()

    finally:
        try:
            mail.logout()
        except:
            pass

    print("✅ 全部完成")


print("⏳ 等待邮件...")
time.sleep(20)

run()
