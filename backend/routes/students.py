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
from sqlalchemy import func, delete, extract, and_
from models.model import Student, StudentImage, Attendance
from typing import List, Optional
import os
import shutil
import asyncio
from db import get_session, AsyncSessionLocal
from dotenv import load_dotenv
import aiofiles
from utils.face_utils import update_student_dataset_embaddings
from controllers.students_pred import base64_to_image, predict_image
from utils.attendance_utils import get_current_time_slot
from datetime import date, datetime, timedelta

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


@router.get("/all")
async def get_all_students(session: AsyncSession = Depends(get_session)):
    stmt = select(Student).order_by(Student.name)
    result = await session.execute(stmt)
    students = result.scalars().all()
    return students


@router.delete("/{student_id}")
async def delete_student(student_id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(Student).where(Student.id == student_id)
    result = await session.execute(stmt)
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Delete images from disk
    student_dir = os.path.join(IMAGES_PATH, student.enrollment_number)
    if os.path.exists(student_dir):
        shutil.rmtree(student_dir)
        
    # Delete from DB (Cascade should handle images and attendance if configured, but let's be safe)
    # Assuming cascade delete is not set up in models, we might need to delete related records first
    # But for now let's try deleting the student directly
    await session.delete(student)
    await session.commit()
    
    return {"message": "Student deleted successfully"}


@router.get("/stats")
async def get_stats(session: AsyncSession = Depends(get_session)):
    # Total Students
    stmt_students = select(func.count(Student.id))
    result_students = await session.execute(stmt_students)
    total_students = result_students.scalar()
    
    # Today's Attendance
    today = date.today()
    stmt_attendance = select(func.count(Attendance.id)).where(func.date(Attendance.date) == today)
    result_attendance = await session.execute(stmt_attendance)
    today_attendance = result_attendance.scalar()
    
    return {
        "total_students": total_students,
        "today_attendance": today_attendance
    }


@router.get("/attendance")
async def get_attendance(session: AsyncSession = Depends(get_session)):
    stmt = select(Attendance, Student).join(Student).order_by(Attendance.date.desc())
    result = await session.execute(stmt)
    records = result.all()
    
    return [
        {
            "id": record.Attendance.id,
            "student_name": record.Student.name,
            "enrollment_number": record.Student.enrollment_number,
            "date": record.Attendance.date,
            "time_slot": record.Attendance.time_slot,
            "status": record.Attendance.status
        }
        for record in records
    ]


@router.get("/attendance/today")
async def get_today_attendance(session: AsyncSession = Depends(get_session)):
    today = date.today()
    stmt = select(Attendance, Student).join(Student).where(func.date(Attendance.date) == today).order_by(Attendance.date.desc())
    result = await session.execute(stmt)
    records = result.all()
    
    return [
        {
            "student_name": record.Student.name,
            "enrollment_number": record.Student.enrollment_number,
            "time_slot": record.Attendance.time_slot,
            "status": record.Attendance.status,
            "enter_time": record.Attendance.date.strftime("%I:%M %p")
        }
        for record in records
    ]


async def mark_attendance(enrollment_number: str):
    slot = get_current_time_slot()
    if not slot:
        return "No active time slot"

    async with AsyncSessionLocal() as session:
        stmt = select(Student).where(Student.enrollment_number == enrollment_number)
        result = await session.execute(stmt)
        student = result.scalars().first()
        
        if not student:
            return "Student not found"

        stmt = select(Attendance).where(
            Attendance.student_id == student.id,
            Attendance.time_slot == slot,
            func.date(Attendance.date) == date.today()
        )
        result = await session.execute(stmt)
        attendance = result.scalars().first()
        
        if attendance:
            return f"Attendance already marked for {slot}"
            
        new_attendance = Attendance(student_id=student.id, time_slot=slot, status="Present")
        session.add(new_attendance)
        await session.commit()
        return f"Attendance marked for {slot}"


@router.get("/analytics")
async def get_analytics(
    period: str = "day",
    slot: Optional[str] = None,
    date_str: Optional[str] = None,
    session: AsyncSession = Depends(get_session)
):
    try:
        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(400, detail="Invalid date format. Use YYYY-MM-DD")
        else:
            target_date = date.today()

        # Use implicit join based on ForeignKey
        query = select(Attendance, Student).join(Student)
        
        if slot and slot != "All":
            query = query.where(Attendance.time_slot == slot)

        if period == "day":
            query = query.where(func.date(Attendance.date) == target_date)
        elif period == "week":
            start_of_week = target_date - timedelta(days=target_date.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            query = query.where(func.date(Attendance.date) >= start_of_week, func.date(Attendance.date) <= end_of_week)
        elif period == "month":
            query = query.where(extract('year', Attendance.date) == target_date.year, extract('month', Attendance.date) == target_date.month)
        elif period == "year":
            query = query.where(extract('year', Attendance.date) == target_date.year)
            
        query = query.order_by(Attendance.date.desc())
            
        result = await session.execute(query)
        rows = result.all()
        
        data = []
        for att, stu in rows:
            data.append({
                "id": att.id,
                "student_name": stu.name,
                "enrollment_number": stu.enrollment_number,
                "date": att.date.isoformat(),
                "time_slot": att.time_slot,
                "status": att.status
            })

        return {"data": data, "count": len(data), "period": period, "target_date": target_date.isoformat()}
    except Exception as e:
        print(f"Error in get_analytics: {e}")
        raise HTTPException(500, detail=str(e))


@router.websocket("/ws/face_recognition")
async def websocket_face_recognition(websocket: WebSocket):
    print("WebSocket connection requested")
    await websocket.accept()
    frame_count = 0
    loop = asyncio.get_event_loop()
    try:
        while True:
            data = await websocket.receive_text()
            frame_count += 1
            
            # Process every 3rd frame to reduce CPU load
            if frame_count % 3 != 0:
                continue

            pil_image = base64_to_image(data)
            

            if pil_image:
                # Run in executor to avoid blocking
                enrollment_number, distance, message, box = await loop.run_in_executor(None, predict_image, pil_image)
                
                attendance_msg = ""
                student_name = ""

                if enrollment_number != "Unknown" and enrollment_number != "error" and enrollment_number != "no face":
                    attendance_msg = await mark_attendance(enrollment_number)
                    
                    async with AsyncSessionLocal() as session:
                        stmt = select(Student).where(Student.enrollment_number == enrollment_number)
                        result = await session.execute(stmt)
                        student = result.scalars().first()
                        if student:
                            student_name = student.name
                
                # Format box as string "x1,y1,x2,y2" or "null"
                box_str = f"{box[0]},{box[1]},{box[2]},{box[3]}" if box else "null"

                await websocket.send_text(f"{enrollment_number},{distance},{message},{attendance_msg},{student_name},{box_str}")
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


@router.get("/{id}/images")
async def get_student_images(id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(Student).where(Student.id == id)
    result = await session.execute(stmt)
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(404, detail="Student not found")
        
    student_dir = os.path.join(IMAGES_PATH, student.enrollment_number)
    if not os.path.exists(student_dir):
        return {"images": []}
        
    images = []
    for filename in os.listdir(student_dir):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            images.append({
                "filename": filename,
                "url": f"http://localhost:8000/images/{student.enrollment_number}/{filename}"
            })
            
    return {"images": images}


@router.delete("/{id}/images/{filename}")
async def delete_student_image(id: int, filename: str, session: AsyncSession = Depends(get_session)):
    stmt = select(Student).where(Student.id == id)
    result = await session.execute(stmt)
    student = result.scalars().first()
    
    if not student:
        raise HTTPException(404, detail="Student not found")
        
    file_path = os.path.join(IMAGES_PATH, student.enrollment_number, filename)
    
    if os.path.exists(file_path):
        os.remove(file_path)
        
        # Try to remove from DB as well
        stmt = delete(StudentImage).where(StudentImage.file_path == file_path)
        await session.execute(stmt)
        await session.commit()
        
        return {"message": "Image deleted"}
    else:
        raise HTTPException(404, detail="Image not found")
