# import json
# from datetime import datetime
# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel
# from typing import List
# import asyncio

# from langchain_groq import ChatGroq
# from langchain_core.prompts import PromptTemplate
# from langchain_core.output_parsers import PydanticOutputParser

# from utils import get_upcoming_festivals_for_prompt

# # --- Pydantic Models ---
# class Festival(BaseModel):
#     id: int
#     name: str
#     date: str
#     daysLeft: int = 0
#     urgency: str
#     items: List[str]
#     expectedSales: str
#     preparation: str
#     color: str

# class RecommendedProduct(BaseModel):
#     id: int
#     name: str
#     demand: str
#     profit: str
#     units: str
#     trend: str
#     yourPrice: str
#     stockLevel: str
#     urgency: str

# class LocalDemand(BaseModel):
#     id: int
#     area: str
#     product: str
#     demand: str
#     distance: str
#     avgSpend: str
#     shoppers: int
#     peakHours: str

# class AvoidProduct(BaseModel):
#     id: int
#     name: str
#     reason: str
#     suggestion: str
#     returnRate: str
#     impact: str
#     lossAmount: str

# class AIRecommendation(BaseModel):
#     id: int
#     product: str
#     action: str
#     priority: str
#     reason: str
#     confidence: str
#     potentialRevenue: str

# class PlannerResponse(BaseModel):
#     upcomingFestivals: List[Festival] = []
#     topProductsToStock: List[RecommendedProduct] = []
#     nearbyDemand: List[LocalDemand] = []
#     avoidProducts: List[AvoidProduct] = []
#     aiRecommendations: List[AIRecommendation] = []

# # --- Router Initialization ---
# router = APIRouter()

# # --- Async Lock to prevent race conditions ---
# lock = asyncio.Lock()

# # --- AI Model Configuration ---
# api_key = ""
# try:
#     model = ChatGroq(
#         model='llama-3.1-8b-instant',
#         api_key=api_key,
#         model_kwargs={"response_format": {"type": "json_object"}}
#     )
# except Exception as e:
#     print(f"Error initializing Groq: {e}")
#     model = None

# # --- Pre-create parser and template once ---
# parser = PydanticOutputParser(pydantic_object=PlannerResponse)
# prompt_template = PromptTemplate(
#     template="""
#     You are an expert Indian retail and inventory planning AI for Meesho sellers.
#     Seller location: {location}.
#     Real upcoming festivals: {real_festivals}.

#     Generate 4 festivals, 5 top products, 3 nearby demand areas, 3 avoid products, 5 AI recommendations.
#     Respond as a single valid JSON object.

#     {format_instructions}
#     """,
#     input_variables=["location", "real_festivals"],
#     partial_variables={"format_instructions": parser.get_format_instructions()},
# )

# # --- API Endpoint ---
# @router.get("/full-report", response_model=PlannerResponse)
# async def get_full_planner_report(location: str = "Delhi"):
#     if not model:
#         raise HTTPException(status_code=500, detail="Groq API model is not configured.")

#     async with lock:
#         try:
#             # Fetch real festivals for prompt
#             real_festivals = get_upcoming_festivals_for_prompt() or []

#             # Build processing chain
#             chain = prompt_template | model | parser

#             # Call AI
#             raw_response = await chain.ainvoke({"location": location, "real_festivals": real_festivals})

#             # Extract clean response if wrapped
#             if isinstance(raw_response, dict) and "InventoryPlan" in raw_response:
#                 clean_response = raw_response["InventoryPlan"]
#             else:
#                 clean_response = raw_response

#             # Parse into Pydantic
#             response = PlannerResponse.model_validate(clean_response)

#             # --- Post-process festivals ---
#             today = datetime.now().date()
#             updated_festivals = []

#             for festival in response.upcomingFestivals:
#                 try:
#                     dt_obj = datetime.strptime(festival.date, "%Y-%m-%d").date()
#                     days_left = (dt_obj - today).days
#                     formatted_date = dt_obj.strftime("%B %d, %Y")
#                     festival = festival.model_copy(update={"date": formatted_date, "daysLeft": days_left})
#                     updated_festivals.append(festival)
#                 except Exception as e:
#                     print(f"Error processing festival {festival.name}: {e}")
#                     updated_festivals.append(festival)

#             response.upcomingFestivals = updated_festivals

#             return response

#         except Exception as e:
#             print(f"Error generating planner report: {e}\nRaw response: {raw_response}")
#             raise HTTPException(status_code=500, detail=f"Error generating planner report: {e}")








import os
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import asyncio
from dotenv import load_dotenv  # ✅ Added

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from utils import get_upcoming_festivals_for_prompt

# --- Load environment variables ---
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")  # ✅ Read key from .env

# --- Pydantic Models ---
class Festival(BaseModel):
    id: int
    name: str
    date: str
    daysLeft: int = 0
    urgency: str
    items: List[str]
    expectedSales: str
    preparation: str
    color: str

class RecommendedProduct(BaseModel):
    id: int
    name: str
    demand: str
    profit: str
    units: str
    trend: str
    yourPrice: str
    stockLevel: str
    urgency: str

class LocalDemand(BaseModel):
    id: int
    area: str
    product: str
    demand: str
    distance: str
    avgSpend: str
    shoppers: int
    peakHours: str

class AvoidProduct(BaseModel):
    id: int
    name: str
    reason: str
    suggestion: str
    returnRate: str
    impact: str
    lossAmount: str

class AIRecommendation(BaseModel):
    id: int
    product: str
    action: str
    priority: str
    reason: str
    confidence: str
    potentialRevenue: str

class PlannerResponse(BaseModel):
    upcomingFestivals: List[Festival] = []
    topProductsToStock: List[RecommendedProduct] = []
    nearbyDemand: List[LocalDemand] = []
    avoidProducts: List[AvoidProduct] = []
    aiRecommendations: List[AIRecommendation] = []

# --- Router Initialization ---
router = APIRouter()

# --- Async Lock to prevent race conditions ---
lock = asyncio.Lock()

# --- AI Model Configuration ---
try:
    model = ChatGroq(
        model='llama-3.1-8b-instant',
        api_key=api_key,
        model_kwargs={"response_format": {"type": "json_object"}}
    )
except Exception as e:
    print(f"Error initializing Groq: {e}")
    model = None

# --- Pre-create parser and template once ---
parser = PydanticOutputParser(pydantic_object=PlannerResponse)
prompt_template = PromptTemplate(
    template="""
    You are an expert Indian retail and inventory planning AI for Meesho sellers.
    Seller location: {location}.
    Real upcoming festivals: {real_festivals}.

    Generate 4 upcoming festivals, 5 top products, 3 nearby demand areas, 3 avoid products, and 5 AI recommendations.
Respond as a single valid JSON object.

All product-related insights (top products, nearby demand, avoid products, and AI recommendations) must focus **only on ethnic wear and festive fashion items** — such as sarees, kurtis, lehengas, dupattas, sherwanis, ethnic jewelry, and related accessories. 
Do not include electronics or unrelated items.

{format_instructions}
    """,
    input_variables=["location", "real_festivals"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

# --- API Endpoint ---
@router.get("/full-report", response_model=PlannerResponse)
async def get_full_planner_report(location: str = "Delhi"):
    if not model:
        raise HTTPException(status_code=500, detail="Groq API model is not configured.")

    async with lock:
        try:
            # Fetch real festivals for prompt
            real_festivals = get_upcoming_festivals_for_prompt() or []

            # Build processing chain
            chain = prompt_template | model | parser

            # Call AI
            raw_response = await chain.ainvoke({"location": location, "real_festivals": real_festivals})

            # Extract clean response if wrapped
            if isinstance(raw_response, dict) and "InventoryPlan" in raw_response:
                clean_response = raw_response["InventoryPlan"]
            else:
                clean_response = raw_response

            # Parse into Pydantic
            response = PlannerResponse.model_validate(clean_response)

            # --- Post-process festivals ---
            today = datetime.now().date()
            updated_festivals = []

            for festival in response.upcomingFestivals:
                try:
                    dt_obj = datetime.strptime(festival.date, "%Y-%m-%d").date()
                    days_left = (dt_obj - today).days
                    formatted_date = dt_obj.strftime("%B %d, %Y")
                    festival = festival.model_copy(update={"date": formatted_date, "daysLeft": days_left})
                    updated_festivals.append(festival)
                except Exception as e:
                    print(f"Error processing festival {festival.name}: {e}")
                    updated_festivals.append(festival)

            response.upcomingFestivals = updated_festivals

            return response

        except Exception as e:
            print(f"Error generating planner report: {e}\nRaw response: {raw_response}")
            raise HTTPException(status_code=500, detail=f"Error generating planner report: {e}")
