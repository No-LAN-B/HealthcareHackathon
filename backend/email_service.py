"""Email notification service for MedRelay."""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_referral_accepted_email(
    patient_email: str,
    patient_name: str,
    specialist_name: str,
    specialty: str,
) -> bool:
    """Send email notification to patient when their referral is accepted."""
    host = os.getenv("EMAIL_HOST", "")
    port = int(os.getenv("EMAIL_PORT", "587"))
    user = os.getenv("EMAIL_USER", "")
    password = os.getenv("EMAIL_PASS", "")

    if not all([host, user, password]):
        print("Email not configured — skipping notification")
        return False

    subject = f"MedRelay: Your Referral Has Been Accepted"
    html_body = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">MedRelay</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p>Dear {patient_name},</p>
            <p>Your referral has been accepted by <strong>{specialist_name}</strong> ({specialty.replace('_', ' ').title()}).</p>
            <p>You will be contacted shortly to schedule your appointment. Please have your health card ready.</p>
            <p style="margin-top: 24px; padding: 16px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
                <strong>What's next?</strong><br>
                The specialist's office will reach out to you within 2-3 business days to arrange your visit.
            </p>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                This is an automated notification from MedRelay. Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"MedRelay <{user}>"
    msg["To"] = patient_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(user, patient_email, msg.as_string())
        print(f"Email sent to {patient_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
