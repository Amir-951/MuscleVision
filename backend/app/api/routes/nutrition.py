import json
import re
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile
from groq import Groq, GroqError
from pydantic import BaseModel

from ...core.config import settings
from ...core.database import fetch_all, execute

router = APIRouter(prefix="/nutrition", tags=["nutrition"])
client = Groq(api_key=settings.groq_api_key) if settings.groq_api_key else None


class PhotoAnalysisRequest(BaseModel):
    image_url: str      # URL Supabase Storage de la photo


class FoodLogRequest(BaseModel):
    user_id: str
    meal_type: str      # breakfast | lunch | dinner | snack
    food_name: str
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    photo_url: Optional[str] = None
    source: str = "manual"


ANALYSIS_PROMPT = """Analyze this food photo and return a JSON object with these exact keys:
{
  "dish_name": "name of the food",
  "estimated_calories": <integer>,
  "protein_g": <float>,
  "carbs_g": <float>,
  "fat_g": <float>,
  "confidence_percent": <integer 0-100>,
  "notes": "any relevant notes about the portion or ingredients"
}

Return ONLY the JSON object, no other text."""


def _extract_json_payload(content: str) -> dict:
    if not content:
        raise ValueError("Empty AI response")

    cleaned = content.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    fenced = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        cleaned,
        flags=re.IGNORECASE | re.DOTALL,
    )
    try:
        return json.loads(fenced)
    except json.JSONDecodeError:
        pass

    start = fenced.find("{")
    end = fenced.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in AI response")

    return json.loads(fenced[start : end + 1])


@router.post("/analyze-photo")
async def analyze_photo(body: PhotoAnalysisRequest):
    if not client:
        raise HTTPException(status_code=503, detail="Groq vision is not configured")

    # Télécharger l'image depuis l'URL
    try:
        async with httpx.AsyncClient() as http:
            img_response = await http.get(body.image_url)
            if img_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Could not fetch image")
            image_data = img_response.content
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Impossible de télécharger l'image pour l'analyse nutrition.",
        ) from exc

    import base64
    img_b64 = base64.standard_b64encode(image_data).decode("utf-8")
    media_type = img_response.headers.get("content-type", "image/jpeg")

    try:
        response = client.chat.completions.create(
            model=settings.groq_vision_model,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{img_b64}",
                            },
                        },
                        {"type": "text", "text": ANALYSIS_PROMPT},
                    ],
                }
            ],
        )
    except GroqError as exc:
        raise HTTPException(
            status_code=502,
            detail="Le provider IA nutrition ne répond pas actuellement.",
        ) from exc

    try:
        result = _extract_json_payload(response.choices[0].message.content)
    except (ValueError, json.JSONDecodeError, IndexError, TypeError):
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    return result


@router.post("/analyze-photo-file")
async def analyze_photo_file(file: UploadFile = File(...)):
    if not client:
        raise HTTPException(status_code=503, detail="Groq vision is not configured")

    image_data = await file.read()
    if not image_data:
        raise HTTPException(status_code=400, detail="Empty image file")

    import base64
    img_b64 = base64.standard_b64encode(image_data).decode("utf-8")
    media_type = file.content_type or "image/jpeg"

    try:
        response = client.chat.completions.create(
            model=settings.groq_vision_model,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{img_b64}",
                            },
                        },
                        {"type": "text", "text": ANALYSIS_PROMPT},
                    ],
                }
            ],
        )
    except GroqError as exc:
        raise HTTPException(
            status_code=502,
            detail="Le provider IA nutrition ne répond pas actuellement.",
        ) from exc

    try:
        result = _extract_json_payload(response.choices[0].message.content)
    except (ValueError, json.JSONDecodeError, IndexError, TypeError):
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    return result


@router.post("/log")
async def log_food(body: FoodLogRequest):
    entry_id = str(uuid.uuid4())
    execute(
        """
        INSERT INTO food_log
          (id, user_id, meal_type, food_name, photo_url,
           calories, protein_g, carbs_g, fat_g, source, logged_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """,
        (entry_id, body.user_id, body.meal_type, body.food_name,
         body.photo_url, body.calories, body.protein_g, body.carbs_g,
         body.fat_g, body.source),
    )
    return {"id": entry_id}


@router.get("/log/today")
async def get_today_log(user_id: str):
    entries = fetch_all(
        """
        SELECT id, meal_type, food_name, photo_url,
               calories, protein_g, carbs_g, fat_g, logged_at, source
        FROM food_log
        WHERE user_id = %s AND DATE(logged_at) = CURRENT_DATE
        ORDER BY logged_at ASC
        """,
        (user_id,),
    )

    totals = {
        "calories": sum(e["calories"] or 0 for e in entries),
        "protein_g": sum(float(e["protein_g"] or 0) for e in entries),
        "carbs_g": sum(float(e["carbs_g"] or 0) for e in entries),
        "fat_g": sum(float(e["fat_g"] or 0) for e in entries),
    }

    return {"entries": entries, "totals": totals}


@router.delete("/log/{entry_id}")
async def delete_log_entry(entry_id: str, user_id: str):
    execute(
        "DELETE FROM food_log WHERE id = %s AND user_id = %s",
        (entry_id, user_id),
    )
    return {"success": True}
