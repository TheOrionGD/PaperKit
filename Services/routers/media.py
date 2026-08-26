import os
import shutil
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
import subprocess

router = APIRouter()

class DownloadRequest(BaseModel):
    url: str

# Use the scratch folder or temp dir to store downloads temporarily
DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scratch", "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def cleanup_file(filepath: str):
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Error cleaning up file {filepath}: {e}")

@router.post("/download-youtube")
async def download_youtube(req: DownloadRequest, background_tasks: BackgroundTasks):
    if not req.url or ("youtube.com" not in req.url and "youtu.be" not in req.url):
        raise HTTPException(status_code=400, detail="Valid YouTube URL required")

    job_id = str(uuid.uuid4())
    output_template = os.path.join(DOWNLOAD_DIR, f"{job_id}_%(title)s.%(ext)s")
    
    try:
        import sys
        bin_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bin")
        command = [
            sys.executable, "-m", "yt_dlp",
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "-o", output_template,
            req.url
        ]
        
        if os.path.exists(bin_dir):
            command.insert(4, "--ffmpeg-location")
            command.insert(5, bin_dir)
        
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"yt-dlp error: {result.stderr}")
            
        # Find the downloaded file
        downloaded_file = None
        for filename in os.listdir(DOWNLOAD_DIR):
            if filename.startswith(job_id):
                downloaded_file = os.path.join(DOWNLOAD_DIR, filename)
                break
                
        if not downloaded_file:
            raise Exception("Downloaded file not found")
            
        # Schedule cleanup after sending response
        background_tasks.add_task(cleanup_file, downloaded_file)
        
        return FileResponse(
            downloaded_file, 
            filename=os.path.basename(downloaded_file).replace(f"{job_id}_", ""),
            media_type="video/mp4"
        )
        
    except Exception as e:
        print(f"YouTube Download Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/download-spotify")
async def download_spotify(req: DownloadRequest, background_tasks: BackgroundTasks):
    if not req.url or "spotify.com" not in req.url:
        raise HTTPException(status_code=400, detail="Valid Spotify URL required")

    job_id = str(uuid.uuid4())
    output_template = os.path.join(DOWNLOAD_DIR, f"{job_id}_" + "{title} - {artists}.{ext}")
    
    try:
        import sys
        bin_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bin")
        ffmpeg_path = os.path.join(bin_dir, "ffmpeg")
        command = [
            sys.executable, "-m", "spotdl",
            "--output", output_template,
            req.url
        ]
        
        if os.path.exists(ffmpeg_path):
            command.insert(3, "--ffmpeg")
            command.insert(4, ffmpeg_path)
        
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"spotdl error: {result.stderr}")
            
        # Find the downloaded file
        downloaded_file = None
        for filename in os.listdir(DOWNLOAD_DIR):
            if filename.startswith(job_id):
                downloaded_file = os.path.join(DOWNLOAD_DIR, filename)
                break
                
        if not downloaded_file:
            raise Exception("Downloaded file not found")
            
        background_tasks.add_task(cleanup_file, downloaded_file)
        
        return FileResponse(
            downloaded_file, 
            filename=os.path.basename(downloaded_file).replace(f"{job_id}_", ""),
            media_type="audio/mpeg"
        )
        
    except Exception as e:
        print(f"Spotify Download Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
