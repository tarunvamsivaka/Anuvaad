import os

import httpx
import resend

from app.core.config import RESEND_API_KEY, logger

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend email service configured in Services layer")
else:
    logger.info("Resend not configured — transactional emails disabled in Services layer")

FRONTEND_BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Anuvaad <notifications@anuvaad.dev>")
RESEND_SEND_URL = "https://api.resend.com/emails"


# FIX-32 (P3-03): Shared base template extracted to eliminate 3× copy-pasted
# HTML wrapper (~60 lines each). All emails now call _email_body() for the
# outer shell and only supply the unique inner HTML.

_BRAND_GRADIENT = "background:linear-gradient(135deg,#d97706,#b45309)"


def _email_body(header_html: str, body_html: str, footer_html: str = "") -> str:
    """Return a complete email HTML document.

    Parameters
    ----------
    header_html:
        Content inside the amber gradient header table cell.
    body_html:
        Content inside the white body table cell.
    footer_html:
        Optional content in the light-grey footer cell.
        Defaults to the standard 'Anuvaad — AI Code Translation Platform' line.
    """
    if not footer_html:
        footer_html = "<p style=\"margin:0;font-size:11px;color:#a1a1aa;\">Anuvaad — AI Code Translation Platform</p>"

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <tr><td style="{_BRAND_GRADIENT};padding:32px 40px;text-align:center;">
        {header_html}
      </td></tr>
      <tr><td style="padding:32px 40px;">
        {body_html}
      </td></tr>
      <tr><td style="padding:20px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
        {footer_html}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>"""


class EmailService:
    """Transactional email service using Resend (free tier: 100 emails/day)."""

    @staticmethod
    def _send(to: str, subject: str, html: str):
        """Synchronous fire-and-forget email send. Used by Celery tasks. Logs errors but never raises."""
        if not RESEND_API_KEY:
            logger.info(f"Email skipped (Resend not configured): {subject} → {to}")
            return
        try:
            resend.Emails.send(
                {
                    "from": EMAIL_FROM,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                }
            )
            logger.info(f"Email sent: {subject} → {to}")
        except Exception as e:
            logger.error(f"Resend email error: {e}")

    @staticmethod
    async def _send_async(to: str, subject: str, html: str) -> None:
        """FIX-33 (P3-06): Async, non-blocking email send via Resend REST API.

        Preferred over _send() in async FastAPI handlers to avoid blocking the event loop.
        Fire-and-forget: logs errors but never raises.
        """
        if not RESEND_API_KEY:
            logger.info(f"Email skipped (Resend not configured): {subject} → {to}")
            return
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    RESEND_SEND_URL,
                    headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
                    json={"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html},
                )
                resp.raise_for_status()
            logger.info(f"Async email sent: {subject} → {to}")
        except Exception as e:
            logger.error(f"Resend async email error: {e}")

    @staticmethod
    def send_welcome(user_email: str, display_name: str = ""):
        name = display_name or user_email.split("@")[0]
        # FIX-32: Uses shared _email_body() instead of duplicating 60 lines of HTML.
        header = """<h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Welcome to Anuvaad</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your AI-powered code translation workspace</p>"""
        body = f"""<p style="margin:0 0 16px;font-size:16px;color:#18181b;">Hi {name},</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">Thanks for joining Anuvaad! Here's what you can do:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:12px 16px;background-color:#fefce8;border-left:3px solid #d97706;border-radius:6px;margin-bottom:12px;">
            <p style="margin:0;font-size:13px;color:#3f3f46;"><strong style="color:#92400e;">Code → English</strong> — Translate any code into plain-English explanations</p>
          </td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td style="padding:12px 16px;background-color:#fefce8;border-left:3px solid #d97706;border-radius:6px;">
            <p style="margin:0;font-size:13px;color:#3f3f46;"><strong style="color:#92400e;">English → Code</strong> — Describe what you need and get working code</p>
          </td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td style="padding:12px 16px;background-color:#fefce8;border-left:3px solid #d97706;border-radius:6px;">
            <p style="margin:0;font-size:13px;color:#3f3f46;"><strong style="color:#92400e;">Code → Code</strong> — Convert between 30+ programming languages</p>
          </td></tr>
        </table>
        <div style="text-align:center;margin:32px 0;">
          <a href="{FRONTEND_BASE_URL}/dashboard/translate" style="display:inline-block;background-color:#d97706;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Start Translating →</a>
        </div>
        <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">Star us on <a href="https://github.com/AdiSuresh/Anuvaad" style="color:#d97706;text-decoration:none;">GitHub</a> if you find Anuvaad useful!</p>"""
        html = _email_body(header, body)
        EmailService._send(user_email, "Welcome to Anuvaad 🚀", html)

    @staticmethod
    def send_subscription_confirmed(user_email: str, plan: str = "pro"):
        header = f"""<h1 style="margin:0;color:#ffffff;font-size:24px;">✦ {plan.title()} Plan Activated</h1>"""
        body = f"""<p style="margin:0 0 16px;font-size:16px;color:#18181b;">Your {plan.title()} subscription is now active!</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">You now have access to:</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#3f3f46;line-height:2;">
          <li>Unlimited daily translations</li>
          <li>DeepSeek R1 reasoning model</li>
          <li>200KB file uploads</li>
          <li>Priority processing</li>
        </ul>
        <div style="text-align:center;margin:24px 0;">
          <a href="{FRONTEND_BASE_URL}/dashboard/translate" style="display:inline-block;background-color:#d97706;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Open Workspace →</a>
        </div>"""
        footer = f"""<p style="margin:0;font-size:11px;color:#a1a1aa;">Manage your subscription in <a href="{FRONTEND_BASE_URL}/dashboard/billing" style="color:#d97706;text-decoration:none;">Billing Settings</a></p>"""
        html = _email_body(header, body, footer)
        EmailService._send(user_email, f"Your Anuvaad {plan.title()} plan is active ✦", html)

    # Backward-compat alias used in tasks.py
    send_subscription_upgrade = send_subscription_confirmed

    @staticmethod
    def send_translation_milestone(user_email: str, count: int):
        header = f"""<h1 style="margin:0;color:#ffffff;font-size:48px;">🎉</h1>
        <h2 style="margin:8px 0 0;color:#ffffff;font-size:22px;">{count} Translations!</h2>"""
        body = f"""<p style="margin:0 0 16px;font-size:16px;color:#18181b;text-align:center;">You've translated <strong>{count}</strong> code snippets with Anuvaad.</p>
        <p style="margin:0 0 24px;font-size:14px;color:#3f3f46;text-align:center;">Keep going — every line of code understood is a step forward.</p>
        <div style="text-align:center;">
          <a href="{FRONTEND_BASE_URL}/dashboard/translate" style="display:inline-block;background-color:#d97706;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Translate More →</a>
        </div>"""
        html = _email_body(header, body)
        EmailService._send(user_email, f"🎉 You've translated {count} snippets with Anuvaad!", html)


email_service = EmailService()
