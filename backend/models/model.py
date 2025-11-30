from sqlalchemy import Column,Integer,String,DateTime,func,ForeignKey
from sqlalchemy.orm import relationship
from db import Base


class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer,primary_key=True,index=True)
    enrollment_number = Column(String,unique=True,index=True)
    name = Column(String,nullable=False)
    created_at = Column(DateTime(timezone=True),server_default=func.now())
    
    images = relationship("StudentImage",back_populates="student")
    
class StudentImage(Base):
    __tablename__ = "student_images"
    
    id = Column(Integer,primary_key=True,index=True)
    file_path = Column(String,nullable=False)
    
    
    student_id = Column(Integer,ForeignKey("students.id"),nullable=False)
    created_at = Column(DateTime(timezone=True),server_default=func.now())
    
    student = relationship("Student",back_populates="images")
    
    