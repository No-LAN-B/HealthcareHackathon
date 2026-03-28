"""Claude AI integration for transcript extraction and referral note finalization."""

import json
import os

import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

MODEL = "claude-sonnet-4-20250514"

EXTRACT_SYSTEM_PROMPT = """You are a clinical documentation assistant integrated into a physician referral system called MedRelay.

Given a raw transcript of a doctor-patient conversation, extract structured clinical information and return ONLY a valid JSON object with no preamble, no markdown, no explanation.

The JSON must have exactly these fields:
{
  "clinical_summary": "2-4 sentence structured clinical note suitable for specialist intake",
  "suggested_specialist": "one of: psychiatrist, cardiologist, orthopedic_surgeon, neurologist, general_practitioner",
  "suggested_urgency": <integer 1-10>,
  "key_symptoms": ["symptom1", "symptom2", ...]
}

Urgency scale:
- 1-3: Routine, non-urgent
- 4-6: Moderate, should be seen within weeks
- 7-8: Urgent, should be seen within days
- 9-10: Emergency, immediate attention needed

Be clinically precise. Use medical terminology appropriate for specialist-to-specialist communication."""

FINALIZE_SYSTEM_PROMPT = """You are a clinical documentation assistant. Given a doctor's transcript, their drafted clinical note, the target specialist type, and the urgency level, generate a formal clinical referral note.

The note should be:
- Professional and concise (3-5 sentences)
- Include relevant clinical findings and patient presentation
- State the reason for referral clearly
- Mention urgency context if high (7+)
- Suitable for a specialist's intake queue

Return ONLY the referral note text, no JSON, no markdown formatting, no preamble."""


def extract_from_transcript(transcript: str) -> dict:
    """Extract clinical summary, specialist type, urgency, and key symptoms from a transcript."""
    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=EXTRACT_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": transcript}
            ],
        )
        text = message.content[0].text.strip()
        # Try to parse JSON, handling potential markdown code blocks
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        return json.loads(text)
    except (json.JSONDecodeError, anthropic.APIError, IndexError) as e:
        print(f"AI extraction error: {e}")
        return {
            "clinical_summary": "Unable to process transcript. Please review and enter clinical notes manually.",
            "suggested_specialist": "general_practitioner",
            "suggested_urgency": 5,
            "key_symptoms": [],
        }


def finalize_referral_note(
    transcript: str,
    clinical_note: str,
    specialist_type: str,
    urgency: int,
) -> str:
    """Generate a formal clinical referral note from transcript and doctor edits."""
    try:
        user_content = f"""Transcript: {transcript}

Doctor's clinical note: {clinical_note}

Target specialist: {specialist_type}
Urgency level: {urgency}/10

Generate a formal referral note."""

        message = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=FINALIZE_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_content}
            ],
        )
        return message.content[0].text.strip()
    except (anthropic.APIError, IndexError) as e:
        print(f"AI finalization error: {e}")
        return clinical_note
