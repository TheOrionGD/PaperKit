import sys
import subprocess

def download_spotify_track(url, output_dir="."):
    """
    Downloads Spotify track, album, or playlist audio along with metadata and album art using spotDL.
    """
    print(f"Downloading Spotify content from: {url}\n")
    
    # Run spotdl CLI command using subprocess
    cmd = [
        sys.executable, "-m", "spotdl", "download", url,
        "--output", output_dir,
        "--dont-filter-results",
        "--audio", "youtube", "youtube-music", "soundcloud"
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print("\nDownload completed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"\nAn error occurred during download: Exit code {e.returncode}")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        spotify_url = sys.argv[1]
    else:
        spotify_url = input("Enter Spotify Track / Album / Playlist URL: ")
    
    if spotify_url.strip():
        download_spotify_track(spotify_url.strip())
    else:
        print("No URL provided.")
