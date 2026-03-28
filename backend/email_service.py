"""Email notification service for MedRelay."""

import logging
import os

import resend

logger = logging.getLogger(__name__)


def send_referral_accepted_email(
    patient_email: str,
    patient_name: str,
    specialist_name: str,
    specialty: str,
    booking_url: str,
) -> bool:
    """Send booking email when a referral is accepted.

    If BOOKING_NOTIFY_EMAIL is set, the message is delivered there (demo / testing).
    Otherwise it goes to the patient's email on file.
    """
    api_key = os.getenv("EMAIL_PASS") or os.getenv("RESEND_API_KEY", "")
    if not api_key:
        logger.warning("EMAIL_PASS (Resend API key) not set — skipping email notification")
        return False

    resend.api_key = api_key

    from_header = (os.getenv("EMAIL_FROM") or "MedRelay <onboarding@resend.dev>").strip()
    notify_override = os.getenv("BOOKING_NOTIFY_EMAIL", "").strip()
    recipient = notify_override or patient_email

    demo_banner = ""
    if notify_override:
        demo_banner = f"""
            <p style="padding: 12px 16px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; font-size: 14px;">
                <strong>Demo delivery</strong> — this booking notice is sent to your inbox instead of the patient.
                In production it would go to <strong>{patient_email}</strong>.
            </p>
        """

    specialty_display = specialty.replace("_", " ").title()

    html_body = f"""
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0f766e, #0d9488); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">MedRelay</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            {demo_banner}
            <p>Dear {patient_name},</p>
            <p>Your referral has been accepted by <strong>{specialist_name}</strong> ({specialty_display}).</p>

            <div style="margin: 24px 0; text-align: center;">
                <a href="{booking_url}"
                   style="display: inline-block; padding: 14px 32px; background: #0d9488; color: white;
                          text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
                    Book Your Appointment
                </a>
            </div>

            <p style="padding: 16px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
                <strong>Available times this week</strong><br>
                Select a time that works for you using the link above.
                The {specialty_display.lower()} has reserved appointment slots
                for you within the next 7 days based on your referral urgency.
            </p>

            <p style="margin-top: 16px;">Please have your health card ready for your visit.</p>

            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                This is an automated notification from MedRelay. Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """

    try:
        resend.Emails.send({
            "from": from_header,
            "to": [recipient],
            "subject": "MedRelay: Book Your Appointment",
            "html": html_body,
        })
        logger.info(
            "Booking email sent via Resend API to %s%s",
            recipient,
            f"; demo override (patient was {patient_email})" if notify_override else "",
        )
        return True
    except Exception as e:
        logger.exception("Resend API failed sending booking email to %s: %s", recipient, e)
        return False
