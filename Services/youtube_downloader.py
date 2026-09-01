import sys
import yt_dlp

def download_youtube_video(url, output_path="."):
    """
    Downloads a YouTube video in the highest available quality using yt-dlp.
    """
    print(f"Downloading video from: {url}")
    ydl_opts = {
        'outtmpl': f'{output_path}/%(title)s.%(ext)s',
        'format': 'bestvideo+bestaudio/best',
        'merge_output_format': 'mp4',
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            print(f"\nDownload completed successfully: '{info.get('title')}'")
    except Exception as e:
        print(f"\nAn error occurred while downloading: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_url = sys.argv[1]
    else:
        video_url = input("Enter the YouTube video URL: ")
    
    if video_url.strip():
        download_youtube_video(video_url.strip())
    else:
        print("No URL provided.")
