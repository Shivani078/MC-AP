import os
import json
import base64
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from dotenv import load_dotenv
from groq import Groq
from langchain_core.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import PydanticOutputParser

load_dotenv()
router = APIRouter()

# --- Initialize Groq Client ---
try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except KeyError:
    groq_client = None


# --- Pydantic Models ---
class SEOContent(BaseModel):
    title: str
    description: str
    tags: List[str]
    keywords: List[str]


class WhatsAppContent(BaseModel):
    caption: str
    promotional_message: str


class ConversationalContent(BaseModel):
    search_phrases: List[str]


class GeneratedContent(BaseModel):
    seo_content: Optional[SEOContent] = None
    whatsapp_content: Optional[WhatsAppContent] = None
    conversational_content: Optional[ConversationalContent] = None
    category: str


class ImproveListingRequest(BaseModel):
    content: GeneratedContent


class TranslateRequest(BaseModel):
    content: GeneratedContent
    language: str


# --- Helper for async generation ---
async def generate_content_part(model, parser_class, prompt_template_str, input_data):
    try:
        parser = PydanticOutputParser(pydantic_object=parser_class)
        prompt = PromptTemplate(
            template=prompt_template_str,
            input_variables=list(input_data.keys()),
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        chain = prompt | model | parser
        return await chain.ainvoke(input_data)
    except Exception as e:
        print(f"Error generating {parser_class.__name__}: {e}")
        return None


# --- Vision Helper ---
async def analyze_image_with_groq(image: UploadFile) -> str:
    """Analyze uploaded product image and return a detailed description."""
    try:
        contents = await image.read()
        encoded_image = base64.b64encode(contents).decode("utf-8")
        file_type = image.content_type or "image/jpeg"

        print("Analyzing image with Groq Vision...")

        chat_completion = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",  # ✅ Updated Vision Model
            messages=[
                {
                    "role": "system",
                    "content": "You are a product vision expert. Describe the product for an e-commerce listing in a detailed yet concise way.",
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this image for an e-commerce listing:"},
                        {"type": "image_url", "image_url": {"url": f"data:{file_type};base64,{encoded_image}"}},
                    ],
                },
            ],
            temperature=0.4,
        )

        result = chat_completion.choices[0].message.content.strip()
        print("✅ Image analysis complete.")
        return result

    except Exception as e:
        print(f"❌ Image analysis error: {e}")
        return "No image insight available."


# --- Main endpoint ---
@router.post("/")
async def generate_listing_endpoint(
    description: str = Form(...),
    category: str = Form(...),
    content_options_str: str = Form('{"seo": true, "whatsapp": true, "conversational": true}'),
    image: Optional[UploadFile] = File(None),
):
    if not os.environ.get("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="Groq API key not configured.")

    try:
        image_description = ""
        if image:
            image_description = await analyze_image_with_groq(image)

        combined_description = (
            f"{description}\n\nImage insight: {image_description}"
            if image_description
            else description
        )

        groq_model = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.5,
            model_kwargs={"response_format": {"type": "json_object"}},
        )

        content_options = json.loads(content_options_str)
        base_input = {"user_description": combined_description, "category": category}
        tasks = []

        if content_options.get("seo"):
            seo_prompt = """You are an SEO content expert for e-commerce in India.
            Write SEO-friendly content for this product.
            Description: "{user_description}"
            Category: "{category}"
            {format_instructions}"""
            tasks.append(generate_content_part(groq_model, SEOContent, seo_prompt, base_input))

        if content_options.get("whatsapp"):
            whatsapp_prompt = """You are a creative marketer for WhatsApp.
            Create a catchy caption and promotional message (1-2 emojis).
            Description: "{user_description}"
            Category: "{category}"
            {format_instructions}"""
            tasks.append(generate_content_part(groq_model, WhatsAppContent, whatsapp_prompt, base_input))

        if content_options.get("conversational"):
            conversational_prompt = """You are an AI expert.
            Write 3-5 natural search phrases Indian users might use to find this product.
            Description: "{user_description}"
            Category: "{category}"
            {format_instructions}"""
            tasks.append(generate_content_part(groq_model, ConversationalContent, conversational_prompt, base_input))

        results = await asyncio.gather(*tasks)
        final_content = GeneratedContent(category=category)

        for result in results:
            if isinstance(result, SEOContent):
                final_content.seo_content = result
            elif isinstance(result, WhatsAppContent):
                final_content.whatsapp_content = result
            elif isinstance(result, ConversationalContent):
                final_content.conversational_content = result

        if not (final_content.seo_content or final_content.whatsapp_content or final_content.conversational_content):
            raise HTTPException(status_code=500, detail="Failed to generate content.")

        return final_content

    except Exception as e:
        print(f"❌ Error in generation: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate listing content.")


# --- Improve Existing Listing ---
@router.post("/improve")
async def improve_listing_endpoint(request: ImproveListingRequest):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")
    try:
        content_json = request.content.json()
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an expert e-commerce copywriter. Improve this content JSON without changing its structure."},
                {"role": "user", "content": f"Improve this content: {content_json}"},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.6,
            response_format={"type": "json_object"},
        )
        return GeneratedContent.parse_raw(chat_completion.choices[0].message.content)
    except Exception as e:
        print(f"Error improving listing: {e}")
        raise HTTPException(status_code=500, detail="Failed to improve listing.")


# --- Translate Listing ---
@router.post("/translate")
async def translate_listing_endpoint(request: TranslateRequest):
    if not groq_client:
        raise HTTPException(status_code=500, detail="Groq API key not configured.")

    content = request.content
    lang = request.language

    async def translate_text(text: str) -> str:
        if not text:
            return text
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": f"Translate this text to {lang}. Only reply with the translation."},
                {"role": "user", "content": text},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        return chat_completion.choices[0].message.content.strip()

    try:
        if content.seo_content:
            content.seo_content.title = await translate_text(content.seo_content.title)
            content.seo_content.description = await translate_text(content.seo_content.description)

        if content.whatsapp_content:
            content.whatsapp_content.caption = await translate_text(content.whatsapp_content.caption)
            content.whatsapp_content.promotional_message = await translate_text(content.whatsapp_content.promotional_message)

        if content.conversational_content:
            content.conversational_content.search_phrases = [
                await translate_text(p) for p in content.conversational_content.search_phrases
            ]

        return content
    except Exception as e:
        print(f"Translation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to translate content.")
