from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_students():
    return {"students": ["Alice", "Bob", "Charlie"]}