import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ai import extract_from_transcript, finalize_referral_note
from schemas import FinalizeRequest, FinalizeResponse, TranscriptRequest, TranscriptResponse

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/extract", response_model=TranscriptResponse)
async def extract(body: TranscriptRequest):
    result = extract_from_transcript(body.transcript)
    return result


@router.post("/extract/stream")
async def extract_stream(body: TranscriptRequest):
    async def generate():
        result = extract_from_transcript(body.transcript)
        yield f"data: {json.dumps(result)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/finalize", response_model=FinalizeResponse)
async def finalize(body: FinalizeRequest):
    note = finalize_referral_note(
        transcript=body.transcript,
        clinical_note=body.clinical_note,
        specialist_type=body.specialist_type,
        urgency=body.urgency,
    )
    return FinalizeResponse(formal_note=note)
