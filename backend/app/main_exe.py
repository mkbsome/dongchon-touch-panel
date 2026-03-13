"""
Standalone entry point for PyInstaller exe build.
This file runs the FastAPI server directly without uvicorn CLI.
"""
import uvicorn
import sys
import os

# Add the parent directory to path for imports
if getattr(sys, 'frozen', False):
    # Running as compiled exe
    application_path = os.path.dirname(sys.executable)
else:
    # Running as script
    application_path = os.path.dirname(os.path.abspath(__file__))

# Change to application directory
os.chdir(application_path)

# Import the FastAPI app
from main import app

if __name__ == "__main__":
    print("=" * 50)
    print("  Dongchon Pickling System - Backend Server")
    print("  Starting on http://localhost:8001")
    print("=" * 50)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )
