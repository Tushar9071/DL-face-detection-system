from fastapi import (
    APIRouter,
    File,
    Form,
    UploadFile,
    HTTPException,
    Depends,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models.model import Student, StudentImage
from typing import List
import os
from db import get_session
from dotenv import load_dotenv
import aiofiles
from utils.face_utils import update_student_dataset_embaddings
from controllers.students_pred import base64_to_image, predict_image

load_dotenv()
router = APIRouter()

IMAGES_PATH = os.getenv("IMAGES_PATH", "./images")


@router.post("/add_students")
async def get_students(
    name: str = Form(...),
    enrollment_number: str = Form(...),
    files: List[UploadFile] = File(...),
    session: AsyncSession = Depends(get_session),
):
    if not files and len(files) > 0 and name and enrollment_number:
        raise HTTPException(400, detail="No files uploaded or missing data")
    # print(enrollment_number)

    stmt = select(Student).where(Student.enrollment_number == enrollment_number)
    result = await session.execute(stmt)
    student = result.scalars().first()

    if not student:
        student = Student(name=name, enrollment_number=enrollment_number)
        session.add(student)
        await session.commit()
    else:
        student.name = name

    student_dir = os.path.join(IMAGES_PATH, enrollment_number)
    os.makedirs(student_dir, exist_ok=True)

    saved_images = 0
    saved_file_paths = []

    for index, file in enumerate(files):
        filename, ext = os.path.splitext(file.filename)
        if not ext:
            ext = ".jpg"

        new_filename = f"{index+1}{ext}"
        file_path = os.path.join(student_dir, new_filename)

        try:
            async with aiofiles.open(file_path, "wb") as out_file:
                content = await file.read()
                await out_file.write(content)
        except Exception as e:
            raise HTTPException(
                500, detail=f"Failed to save file {file.filename}: {str(e)}"
            )

        new_img = StudentImage(file_path=file_path, student_id=student.id)
        session.add(new_img)
        saved_images += 1
        saved_file_paths.append(file_path)

    await session.commit()
    await session.refresh(student, attribute_names=["images"])

    try:
        success = update_student_dataset_embaddings(enrollment_number, saved_file_paths)
        status_msg = "Embeddings updated." if success else "No embeddings updated."
        print(status_msg)
    except Exception as e:
        print(f"Error updating embeddings: {e}")
        status_msg = "Failed to update embeddings."

    return {
        "message": f"Student saved. {status_msg}",
        "student_id": student.id,
        "enrollment_number": student.enrollment_number,
        "name": student.name,
        "total_images": saved_images,
    }


@router.websocket("/ws/face_recognition")
async def websocket_face_recognition(websocket: WebSocket):
    print("WebSocket connection requested")
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()

            pil_image = base64_to_image(data)
            

            if pil_image:
                result_name, distance, message = predict_image(pil_image)

                await websocket.send_text(f"{result_name},{distance},{message}")
            else:
                await websocket.send_text("Error,Invalid image data")

    except WebSocketDisconnect:
        print(f"WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass
