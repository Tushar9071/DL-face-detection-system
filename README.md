# Face Recognition Attendance System

A robust, full-stack application designed to automate student attendance using real-time face recognition. This system leverages deep learning models to detect and identify students from a live camera feed, managing attendance records efficiently through a modern web interface.

## 🚀 Features

- **Real-time Face Recognition**: Utilizes MTCNN for face detection and InceptionResnetV1 (Facenet) for generating face embeddings.
- **Live Video Feed**: Interactive camera interface with visual feedback (bounding boxes) and identification status.
- **Automated Attendance**: Automatically marks attendance when a registered student is identified within a specific time slot.
- **Admin Dashboard**:
  - **Analytics**: View attendance statistics (Daily, Weekly, Monthly, Yearly) and filter by time slots.
  - **Student Management**: Register new students, manage enrollment details, and delete records.
  - **Image Management**: Upload and manage reference photos for training the recognition model.
- **Performance Optimized**: Implements frame skipping and image resizing to ensure smooth operation even on CPU-based environments.

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: PostgreSQL (with [SQLAlchemy](https://www.sqlalchemy.org/) Async & `asyncpg`)
- **ML/AI**: 
  - `facenet-pytorch` (MTCNN, InceptionResnetV1)
  - `torch` (PyTorch)
  - `Pillow` (Image processing)
  - `numpy`
- **Utilities**: `uvicorn`, `python-multipart`

### Frontend
- **Framework**: [React](https://react.dev/) (with [Vite](https://vitejs.dev/))
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: Axios
- **Routing**: React Router DOM

## 📂 Project Structure

```
project/
├── backend/                 # FastAPI Backend
│   ├── controllers/         # Logic for face prediction
│   ├── face_detection_models/ # Scripts for building embeddings & recognition
│   ├── models/              # SQLAlchemy database models
│   ├── routes/              # API endpoints (students, analytics, websocket)
│   ├── utils/               # Helper functions
│   ├── db.py                # Database connection setup
│   ├── main.py              # Application entry point
│   └── requirements.txt     # Python dependencies
│
└── frontend/                # React Frontend
    ├── src/
    │   ├── camera_models/   # Components for live camera & prediction
    │   ├── components/      # Shared UI components
    │   ├── pages/           # Admin Panel & Main Pages
    │   ├── services/        # API service calls
    │   └── App.tsx          # Main application component
    ├── package.json         # Node.js dependencies
    └── vite.config.ts       # Vite configuration
```

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js & npm
- PostgreSQL Database

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```

2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```

3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

4.  Configure Environment Variables:
    Create a `.env` file in the `backend` directory and add your database URL:
    ```env
    DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
    ```

5.  Run the server:
    ```bash
    uvicorn main:app --reload
    ```
    The backend will start at `http://localhost:8000`.

### 2. Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```
    The frontend will start at `http://localhost:5173` (or the port shown in terminal).

## 🐳 Docker Support

The project includes a `Dockerfile` for the backend. To build and run the backend container:

```bash
cd backend
docker build -t face-recognition-backend .
docker run -p 8000:8000 --env-file .env face-recognition-backend
```

## 📝 Usage

1.  **Admin Panel**: Open the frontend application and navigate to the Admin Panel.
2.  **Register Students**: Add new students and upload clear reference photos of their faces.
3.  **Start Recognition**: Go to the live camera feed. The system will detect faces and match them against the registered database.
4.  **View Attendance**: Check the Admin Panel to see real-time attendance updates and analytics.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
