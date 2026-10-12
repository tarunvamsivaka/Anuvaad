"""
Root entrypoint for Anuvaad FastAPI application.
Ensures seamless compatibility with Render web service startCommand: `uvicorn main:app --host 0.0.0.0 --port 10000`.
"""
import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
