import os
import uuid
import httpx
import yt_dlp
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

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
        bin_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bin")
        
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
        }
        
        if os.path.exists(bin_dir):
            ydl_opts['ffmpeg_location'] = bin_dir
            
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([req.url])
            
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
    output_template = os.path.join(DOWNLOAD_DIR, f"{job_id}_%(title)s.%(ext)s")
    
    try:
        bin_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bin")
        
        # 1. Fetch metadata from Spotify oEmbed
        track_title = "spotify_track"
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
                resp = await client.get(f"https://open.spotify.com/oembed?url={req.url}")
                if resp.status_code == 200:
                    data = resp.json()
                    track_title = data.get("title", "spotify_track")
        except Exception as oembed_err:
            print(f"Spotify oEmbed notice: {oembed_err}")

            
        # 2. Download audio via yt_dlp search
        query = f"ytsearch1:{track_title} audio"
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'quiet': True,
            'no_warnings': True,
        }
        
        if os.path.exists(bin_dir):
            ydl_opts['ffmpeg_location'] = bin_dir
            
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([query])
            
        # Find the downloaded file
        downloaded_file = None
        for filename in os.listdir(DOWNLOAD_DIR):
            if filename.startswith(job_id):
                downloaded_file = os.path.join(DOWNLOAD_DIR, filename)
                break
                
        if not downloaded_file:
            raise Exception("Downloaded audio file not found")
            
        background_tasks.add_task(cleanup_file, downloaded_file)
        
        return FileResponse(
            downloaded_file, 
            filename=os.path.basename(downloaded_file).replace(f"{job_id}_", ""),
            media_type="audio/mpeg"
        )
        
    except Exception as e:
        print(f"Spotify Download Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

