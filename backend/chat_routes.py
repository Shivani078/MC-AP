# chat_routes.py
import os
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import requests # Added for weather data
import google.generativeai as genai
from PIL import Image
import io

# --- Custom Utility Import ---
from utils import get_rich_context

# --- LangChain Imports ---
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# --- Configuration ---
from dotenv import load_dotenv
load_dotenv()

# --- Router Initialization ---
router = APIRouter()

# --- AI Model Configuration ---
# Groq for fast text-only chat
try:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise KeyError("GROQ_API_KEY not found in .env file")
    groq_model = ChatGroq(model="llama-3.1-8b-instant")
except Exception as e:
    print(f"Error during Groq configuration in chat: {e}")
    groq_model = None

# Gemini for multimodal chat (image support)
try:
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise KeyError("GOOGLE_API_KEY not found in .env file")
    genai.configure(api_key=google_api_key)
    gemini_vision_model = genai.GenerativeModel('gemini-1.5-flash')
except Exception as e:
    print(f"Error during Gemini configuration in chat: {e}")
    gemini_vision_model = None


# --- Helper Functions ---
# This has been moved to utils.py and improved.


# --- Pydantic Models for Chat ---
class ChatPart(BaseModel):
    text: str

class IncomingChatMessage(BaseModel):
    role: str
    parts: List[ChatPart]

class ChatResponse(BaseModel):
    reply: str

# --- API Endpoint for Chat ---
@router.post("/", response_model=ChatResponse)
async def chat_with_copilot_ai(
    current_query: str = Form(...),
    language: str = Form("english"),
    history_str: str = Form("[]"), # History as a JSON string
    products_str: str = Form("[]"), # Products as a JSON string
    pincode: str = Form(""), # User's pincode
    image: Optional[UploadFile] = File(None)
):
    
    # --- System Prompt and Context Setup ---
    now = datetime.now()
    current_date_str = now.strftime("%A, %B %d, %Y")
    
    # Deserialize products from JSON string
    import json
    try:
        products = json.loads(products_str)
    except json.JSONDecodeError:
        products = []
        
    # Get all context from the new utility function
    rich_context = get_rich_context(products=products, pincode=pincode)
    
    if language.lower() == 'hindi':
        language_instruction = "You must respond only in Hindi."
    elif language.lower() == 'hinglish':
        language_instruction = "You must respond in Hinglish (a mix of Hindi and English)."
    else: # Default to English
        language_instruction = "You must respond only in English."

    system_prompt = f"""
    You are 'Seller Saathi', a friendly and expert AI assistant for Meesho sellers in India.
    Your persona is helpful, encouraging, and an expert in Indian e-commerce.
    
    **Current Date**: The current date is **{current_date_str}**.
    
    **CRITICAL INSTRUCTIONS**
    1.  **Primary Context**: Your main source of truth is the detailed context block provided below. Use the product inventory, local weather, and upcoming festivals to give highly relevant and specific advice.
    2.  **Language**: {language_instruction}
    3.  **Goal**: Your goal is to give simple, actionable advice to help sellers succeed. Connect your answers to the provided context.
        - If the user asks about what to stock, look at the upcoming festivals and weather.
        - If the user asks for marketing ideas, suggest promoting products relevant to the current season or events.
    4.  **Conciseness**: Keep your answers short and easy to understand for a non-technical user.
    5.  **Images**: If the user provides an image, analyze it in the context of their query. For example, if they ask to create a product listing, use the image to inform the description.
    6.  **No Guessing**: If you cannot answer using the provided context, politely say that you don't have enough information and ask a clarifying question.
    
    {rich_context}
    """

    # --- Model Invocation ---
    try:
        # --- Handle Image Input with Gemini ---
        if image and gemini_vision_model:
            if not image.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
            
            image_content = await image.read()
            img = Image.open(io.BytesIO(image_content))
            
            # Gemini works with a list of content parts [text, image]
            prompt_parts = [current_query, img]
            
            response = gemini_vision_model.generate_content(prompt_parts)
            ai_text = response.text

        # --- Handle Text-Only Input with Groq ---
        elif not image and groq_model:
            # History needs to be parsed from the JSON string
            import json
            history_list = json.loads(history_str)
            
            langchain_messages = [SystemMessage(content=system_prompt)]
            for message_data in history_list:
                # Assuming history_list is a list of dicts like {'role': 'user', 'parts': [{'text': '...'}]}
                message = IncomingChatMessage(**message_data)
                content = message.parts[0].text
                if message.role.lower() == 'user':
                    langchain_messages.append(HumanMessage(content=content))
                elif message.role.lower() in ['model', 'bot']:
                    langchain_messages.append(AIMessage(content=content))
            
            langchain_messages.append(HumanMessage(content=current_query))
            
            ai_response = groq_model.invoke(langchain_messages)
            ai_text = ai_response.content if ai_response.content else "Sorry, I couldn't process that. Please try again."

        else:
            # Handle case where no model is available
            raise HTTPException(status_code=500, detail="No AI model is configured or available.")

        return ChatResponse(reply=ai_text)

    except Exception as e:
        print(f"An error occurred in chat_with_copilot_ai: {e}")
        # Consider more specific error handling here
        raise HTTPException(status_code=500, detail=f"An error occurred while processing the AI request: {str(e)}")

