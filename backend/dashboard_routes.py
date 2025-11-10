import os
import time
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from dotenv import load_dotenv

# --- Load environment variables ---
load_dotenv()

# --- Custom Utility Import ---
from utils import get_rich_context

# --- LangChain Imports ---
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

# --- Router Initialization ---
router = APIRouter()

# ===============================
# 🔹 CONFIGURE GROQ API KEY HERE
# ===============================
groq_api_key = os.getenv("GROQ_API_KEY")

if not groq_api_key:
    raise RuntimeError("❌ GROQ_API_KEY not found in .env file. Please add it before running.")

# --- AI Model Configuration ---
try:
    groq_model = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0.7,
        max_retries=2,
        api_key=groq_api_key,  # ✅ use env key here
    )
except Exception as e:
    print(f"Error during Groq configuration in dashboard routes: {e}")
    groq_model = None


# --- Pydantic Models for Structured Output ---
class AISummary(BaseModel):
    focus: str = Field(description="A concise, actionable focus for the week. Should be 1-2 sentences.")
    opportunity: str = Field(description="A key product or category opportunity to capitalize on. 1-2 sentences.")
    caution: str = Field(description="A key product or category to be cautious about. 1-2 sentences.")
    action: str = Field(description="A single, clear, actionable next step for the seller. 1 sentence.")


# --- API Endpoint for AI Summary ---
@router.post("/summary", response_model=AISummary)
async def get_ai_dashboard_summary(
    products: List[Dict[str, Any]] = Body(...),
    pincode: str = Body(...)
):
    """
    Generates a weekly actionable summary for Meesho sellers using Groq AI.
    """
    if not groq_model:
        raise HTTPException(status_code=500, detail="AI model is not configured.")

    # 1️⃣ Generate rich local + product context
    rich_context = get_rich_context(products=products, pincode=pincode)

    # 2️⃣ Prepare structured output parser
    parser = PydanticOutputParser(pydantic_object=AISummary)

    # 3️⃣ Define AI prompt template
    prompt_template = """
    You are an expert e-commerce analyst for sellers in India.
    Your task is to provide a short, actionable weekly summary based on the context.

    **Analyze the following context:**
    {context}

    **Your Instructions:**
    - Be concise, practical, and encouraging.
    - Base your advice strictly on product inventory, local weather, and upcoming festivals.
    - Do not invent data. If context is limited, give general business guidance.
    - Output strictly in this JSON structure:

    {format_instructions}

    **RESPONSE:**
    """

    prompt = ChatPromptTemplate.from_template(
        template=prompt_template,
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )

    # 4️⃣ Combine into LangChain chain
    chain = prompt | groq_model | parser

    # 5️⃣ Safely invoke AI model with retry logic
    try:
        summary_response = await chain.ainvoke({"context": rich_context})
        return summary_response

    except Exception as e:
        err_str = str(e)
        print(f"⚠️ Error invoking AI chain for summary: {err_str}")

        # Handle rate limit gracefully
        if "rate_limit" in err_str.lower() or "429" in err_str:
            print("Rate limit hit — retrying after cooldown...")
            time.sleep(90)  # Wait 1.5 minutes
            try:
                summary_response = await chain.ainvoke({"context": rich_context})
                return summary_response
            except Exception as retry_err:
                print(f"Retry failed: {retry_err}")

        # Fallback default summary (if AI fails)
        fallback = AISummary(
            focus="Maintain steady stock and monitor demand patterns across top categories.",
            opportunity="Capitalize on trending and weather-relevant products this week.",
            caution="Avoid overstocking slow-moving or seasonal items nearing demand decline.",
            action="Review key listings and adjust pricing or bundles to improve visibility.",
        )
        return fallback
