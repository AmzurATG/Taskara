# 🚀 Task Generator Application - Run Commands

This guide provides all the commands needed to run the complete Task Generator application stack.

## 📋 Prerequisites

- Python 3.8+ installed
- All dependencies installed: `pip install -r requirements.txt`
- PostgreSQL database running
- Redis downloaded and available

## 🏃‍♂️ Running the Application Stack

### 1. 🔴 Start Redis Server

Redis is required for Celery background tasks and caching.

```powershell
# Navigate to Redis directory (adjust path if different)
cd C:\temp\redis

# Start Redis on port 9095 (as configured in celery_app.py)
.\redis-server.exe --port 9095

# OR run in background (Windows)
Start-Process -FilePath ".\redis-server.exe" -ArgumentList "--port 9095" -WindowStyle Hidden
```

**Verify Redis is running:**
```powershell
cd "d:\Amzur\Task_Generator"
python -c "import redis; r = redis.Redis(host='localhost', port=9095); print('Redis status:', r.ping())"
```

### 2. 🌐 Start FastAPI Server (uvicorn)

The main web server for API endpoints.

```powershell
# Navigate to project directory
cd "d:\Amzur\Task_Generator"

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# OR for production (without reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Server will be available at:**
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. 🔄 Start Celery Worker

Background task processor for AI jobs and file processing.

```powershell
# Navigate to project directory
cd "d:\Amzur\Task_Generator"

# Start Celery worker
celery -A app.core.celery_app worker --loglevel=info

# OR for Windows with additional options
celery -A app.core.celery_app worker --loglevel=info --pool=solo --purge     
```

**Optional: Start Celery Flower (Monitoring UI)**
```powershell
celery -A app.core.celery_app flower --port=5555
```
Access at: http://localhost:5555

## 🚀 Quick Start Script

Run all services in separate terminals:

### Terminal 1 - Redis
```powershell
# Step 1: Navigate to Redis directory
cd C:\temp\redis

# Step 2: Start Redis server on port 9095
.\redis-server.exe --port 9095

# OR use full path if not in Redis directory:
# C:\temp\redis\redis-server.exe --port 9095
```

### Terminal 2 - FastAPI Server
```powershell
cd "d:\Amzur\Task_Generator"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 3 - Celery Worker
```powershell
cd "d:\Amzur\Task_Generator"
celery -A app.core.celery_app worker --loglevel=info
```

## 🔍 Health Checks

### Check if all services are running:

**Redis:**
```powershell
python -c "import redis; r = redis.Redis(host='localhost', port=9095); print('Redis:', r.ping())"
```

**FastAPI:**
```powershell
curl http://localhost:8000/health
# OR
Invoke-WebRequest -Uri "http://localhost:8000/health"
```

**Celery:**
```powershell
celery -A app.core.celery_app inspect active
```

## 🛑 Stopping Services

### Stop Redis:
```powershell
# Method 1: Stop by process name (recommended)
Get-Process -Name "redis-server" | Stop-Process -Force

# Method 2: Stop by port (if you know the PID)
Get-Process -Name "redis-server" -ErrorAction SilentlyContinue | Stop-Process -Force

# Method 3: Kill all Redis processes
Stop-Process -Name "redis-server" -Force

# Method 4: Using Redis CLI to shutdown gracefully
C:\temp\redis\redis-cli.exe -p 9095 shutdown

# Verify Redis is stopped
Get-Process -Name "*redis*" -ErrorAction SilentlyContinue
```

### Stop uvicorn:
- Press `Ctrl+C` in the terminal running uvicorn

### Stop Celery:
- Press `Ctrl+C` in the terminal running celery worker

## 🐛 Troubleshooting

### Common Issues:

1. **Redis Connection Error:**
   - Ensure Redis is running on port 9095
   - Check firewall settings
   - Verify Redis configuration in `app/core/celery_app.py`

2. **Celery Worker Not Starting:**
   - Ensure Redis is running first
   - Check Python path and dependencies
   - Try with `--pool=solo` flag on Windows

3. **FastAPI Server Issues:**
   - Check if port 8000 is available
   - Ensure all dependencies are installed
   - Check database connection settings

4. **Database Connection:**
   - Ensure PostgreSQL is running
   - Check connection string in `.env` file
   - Run migrations: `alembic upgrade head`

## 📱 Development vs Production

### Development (with auto-reload):
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production:
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🔗 Useful URLs

- **API Documentation:** http://localhost:8000/docs
- **Alternative Docs:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health
- **Celery Flower:** http://localhost:5555 (if running)

## 📝 Notes

- Redis runs on port **9095** (not the default 6379) as configured in celery_app.py
- FastAPI runs on port **8000**
- Celery Flower runs on port **5555**
- Make sure to start Redis before starting Celery workers
- All services should be running for full application functionality