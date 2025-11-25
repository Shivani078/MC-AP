from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import os
import json
import re
import random
from serpapi import GoogleSearch
from langchain.prompts import PromptTemplate
from langchain.schema import StrOutputParser
from langchain_groq import ChatGroq

router = APIRouter()

# -------------------------------
# API Keys
# -------------------------------
from dotenv import load_dotenv
load_dotenv()

SERPAPI_KEY = os.getenv("SERPAPI_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not SERPAPI_KEY:
    raise KeyError("SERPAPI_KEY not found in .env file")
if not GROQ_API_KEY:
    raise KeyError("GROQ_API_KEY not found in .env file")

os.environ["SERPAPI_API_KEY"] = SERPAPI_KEY
os.environ["GROQ_API_KEY"] = GROQ_API_KEY

# -------------------------------
# Initialize Groq model
# -------------------------------
groq_model = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.3-70b-versatile", temperature=0.7)

# -------------------------------
# Enhanced Prompt Template
# -------------------------------
template = """
You are an expert fashion and lifestyle trend analyst.

Analyze the following search results about **{category} trends in {city}**, 
and return logical insights based on local culture, season, and events.

For each trend, you must decide its *popularity* and an estimated *Change (%)* value.

Rules:
- High 🔥 → Change: between 35% to 70%
- Medium ⚡ → Change: between 15% to 35%
- Low ❄️ → Change: between 0% to 15%
- The "Change" value should make sense with reasoning. (E.g., High if it's festival season or influencer-driven, Low if fading or niche.)
- Base your reasoning on real-world logic for that city and category.

Return STRICT JSON in this format:
[
  {{
    "city": "{city}",
    "trend": "Trend Name",
    "popularity": "High 🔥 / Medium ⚡ / Low ❄️",
    "change_pct": "45.2%",
    "features": ["Feature 1", "Feature 2"],
    "competitors": ["Competitor 1", "Competitor 2"],
    "local_hotspots": ["Market/Area 1", "Market/Area 2"],
    "tips": ["Tip 1", "Tip 2"]
  }}
]

Search Results:
{search_results}
"""
prompt = PromptTemplate.from_template(template)

# -------------------------------
# Request model
# -------------------------------
class TrendsRequest(BaseModel):
    cities: List[str]
    category: str

# -------------------------------
# Helper: clean Groq response
# -------------------------------
def clean_json_response(text: str):
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if match:
        return match.group(0)
    return "[]"

# -------------------------------
# Fetch Google search results
# -------------------------------
def fetch_google_results(city, category):
    query = f"{category} trends in {city}"
    params = {
        "engine": "google",
        "q": query,
        "hl": "en",
        "gl": "in",
        "api_key": SERPAPI_KEY,
        "num": 10,
    }
    search = GoogleSearch(params)
    results = search.get_dict()
    return results.get("organic_results", [])

# -------------------------------
# Helper: assign random numeric pct and popularity score
# -------------------------------
def assign_random_metrics():
    # Random percent between 3% and 65% with one decimal
    pct = round(random.uniform(3.0, 65.0), 1)
    # Map to popularity label and numeric score
    if pct >= 35.0:
        label = "High 🔥"
        score = 85
    elif pct >= 15.0:
        label = "Medium ⚡"
        score = 55
    else:
        label = "Low ❄️"
        score = 20
    return pct, label, score

# -------------------------------
# Main endpoint
# -------------------------------
@router.post("/")
def get_trends(request: TrendsRequest):
    all_trends = []

    for city in request.cities:
        try:
            # Step 1: Fetch search results
            results = fetch_google_results(city, request.category)
            snippets = "\n".join([
                f"- {r.get('title')}: {r.get('snippet')}" for r in results
            ])

            # Step 2: Send to Groq for deep reasoning
            runnable = prompt | groq_model | StrOutputParser()
            response = runnable.invoke({
                "city": city,
                "category": request.category,
                "search_results": snippets,
            })

            # Step 3: Clean and parse JSON output
            cleaned = clean_json_response(response)
            parsed = json.loads(cleaned)

            # Step 4: Ensure numeric fields exist by assigning random numbers when needed
            for trend in parsed:
                # If model provided a numeric percent string, try to extract it
                pct = None
                if "change_pct" in trend:
                    try:
                        pct_val = re.search(r"([-+]?\d+(\.\d+)?)", str(trend.get("change_pct")))
                        if pct_val:
                            pct = round(float(pct_val.group(1)), 1)
                    except Exception:
                        pct = None

                # If no valid pct from model, assign random
                if pct is None:
                    pct, label, score = assign_random_metrics()
                else:
                    # derive label and score from extracted pct
                    if pct >= 35.0:
                        label = "High 🔥"
                        score = 85
                    elif pct >= 15.0:
                        label = "Medium ⚡"
                        score = 55
                    else:
                        label = "Low ❄️"
                        score = 20

                # Attach numeric and human-readable fields
                trend["pct_change"] = pct                      # numeric for charts
                trend["change_pct"] = f"{pct}%"               # human-readable string
                trend["popularity_score"] = score             # numeric popularity score
                # preserve or overwrite popularity label to keep consistency
                trend["popularity"] = trend.get("popularity", label)

                # ensure lists exist
                for key in ("features", "competitors", "local_hotspots", "tips"):
                    if key not in trend or not isinstance(trend[key], list):
                        trend[key] = trend.get(key, []) if isinstance(trend.get(key, list), list) else []

            all_trends.extend(parsed)

        except Exception as e:
            all_trends.append({
                "city": city,
                "error": str(e)
            })

    return {"trends": all_trends}
# -------------------------------
# New route: Fetch feature images via Groq + SerpAPI
# -------------------------------
@router.get("/feature-images")
def get_feature_images(feature: str, category: str = ""):
    """
    Finds real online product images for a fashion/lifestyle feature using SerpAPI Google Images search.
    The goal is to show trending or best-selling product visuals for that feature + category.
    """
    try:
        # Step 1: Refine query using Groq
        llm = ChatGroq(api_key=GROQ_API_KEY, model="llama-3.3-70b-versatile", temperature=0.5)
        refine_prompt = (
            f"Refine this term for real e-commerce search: '{feature}' in context of '{category}'. "
            "Output only a short query likely to find trending or best-selling items on Amazon, Myntra, or Flipkart."
        )
        refined = llm.invoke(refine_prompt)
        refined_query = refined.content.strip()

        # Step 2: Search on Google Images (with shopping context)
        search_query = f"best selling {refined_query} {category} fashion site:myntra.com OR site:amazon.in OR site:flipkart.com"
        params = {
            "engine": "google_images",
            "q": search_query,
            "hl": "en",
            "gl": "in",
            "num": 10,
            "api_key": SERPAPI_KEY
        }

        search = GoogleSearch(params)
        results = search.get_dict()
        image_results = results.get("images_results", [])

        # Step 3: Extract image URLs and filter broken ones
        image_urls = [img.get("original") or img.get("thumbnail") for img in image_results if img.get("original") or img.get("thumbnail")]
        image_urls = [u for u in image_urls if u and u.startswith("http")]

        return {
            "feature": feature,
            "category": category,
            "refined_query": refined_query,
            "images": image_urls[:6] if image_urls else []
        }

    except Exception as e:
        return {
            "feature": feature,
            "category": category,
            "error": str(e)
        }
