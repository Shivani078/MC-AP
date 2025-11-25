# uvicorn main:app --reload (to run backend from backend folder)
from fastapi import FastAPI
from cors_config import setup_cors

# Import the routers from your feature-specific files
from chat_routes import router as chat_router
from planner_routes import router as planner_router
from trends_routes import router as trends_router
from product_listing_routes import router as product_listing_router
from dashboard_routes import router as dashboard_router

# --- New: Cron router ---
from fastapi import APIRouter

cron_router = APIRouter()

@cron_router.get("/run-cron")
def run_cron_task():
    """
    Endpoint for cron jobs.
    Add your scheduled task logic here.
    """
    # Example task:
    print("Cron task executed!")  # For debugging logs on Render
    return {"status": "success", "message": "Cron task executed!"}

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Meesho Seller AI Co-pilot API",
    description="API endpoints for the AI Co-pilot, including chat and inventory planning.",
    version="1.0.0"
)

# --- Setup CORS ---
setup_cors(app)

# --- Include Routers ---
app.include_router(chat_router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(planner_router, prefix="/api/planner", tags=["Inventory Planner"])
app.include_router(trends_router, prefix="/api/trends", tags=["Trends & Insights"])
app.include_router(product_listing_router, prefix="/api/listing", tags=["Product Listing"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])

# --- Include Cron Router ---
app.include_router(cron_router, prefix="/api/cron", tags=["Cron Tasks"])

# --- Root Endpoint for Health Check ---
@app.get("/", tags=["Root"])
def read_root():
    """A simple health check endpoint to confirm the API is running."""
    return {"message": "Welcome to the Meesho AI Co-pilot Backend!"}
