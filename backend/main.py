from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.students import router as students_router
import os
from dotenv import load_dotenv
from db import engine, Base
import base64
from PIL import Image
import io
import torch


load_dotenv()
app = FastAPI()

app.include_router(students_router, prefix="/api/students")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    print("Starting up...")
    images_path = os.getenv("IMAGES_PATH", "./images")
    DATABASE_URL = os.getenv("DATABASE_URL")
    print(f"Images path: {images_path}")
    print(f"Database URL: {DATABASE_URL}")
    print("Device is working on:", "cuda" if torch.cuda.is_available() else "cpu")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def read_root():
    return {"message": "Welcome to the Student Face Recognition API"}


def base64_to_image(base64_str):
    try:
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]

        image_data = base64.b64decode(base64_str)
        return Image.open(io.BytesIO(image_data)).convert("RGB")
    except Exception as e:
        print(f"Error converting image: {e}")
        return None
