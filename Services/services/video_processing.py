"""Video processing service using FFmpeg subprocess.

Real progress is parsed from FFmpeg stderr (duration + time).

Supports: convert, transcode, trim, merge, extract_audio, normalize_audio,
          extract_frames, frames_to_video, frames_to_gif.
"""
from __future__ import annotations

import io
import os
import re
import subprocess
import tempfile
import glob
from typing import Callable


# ── FFmpeg helpers ────────────────────────────────────────────────────────────

def _ffmpeg_path() -> str:
    from config import get_settings
    s = get_settings()
    return getattr(s, "ffmpeg_path", "ffmpeg")


def _ffprobe_path() -> str:
    from config import get_settings
    s = get_settings()
    return getattr(s, "ffprobe_path", "ffprobe")


def _get_duration(file_path: str) -> float:
    """Return video duration in seconds via ffprobe."""
    try:
        result = subprocess.run(
            [
                _ffprobe_path(), "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                file_path,
            ],
            capture_output=True, text=True, timeout=30,
        )
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def _run_ffmpeg(args: list[str], total_duration: float, progress_cb: Callable | None,
                timeout: int = 600) -> subprocess.CompletedProcess:
    """Run FFmpeg, parsing stderr for real progress updates."""
    time_re = re.compile(r"time=(\d+):(\d+):(\d+)\.(\d+)")
    proc = subprocess.Popen(
        [_ffmpeg_path(), "-y"] + args,
        stderr=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        text=True,
    )
    stderr_lines = []
    try:
        for line in proc.stderr:
            stderr_lines.append(line)
            if progress_cb and total_duration > 0:
                m = time_re.search(line)
                if m:
                    h, mi, s, cs = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
                    elapsed = h * 3600 + mi * 60 + s + cs / 100
                    pct = int(15 + min(elapsed / total_duration, 1.0) * 80)
                    progress_cb(pct)
        proc.wait(timeout=timeout)
    except Exception:
        proc.kill()
        proc.wait()

    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg failed:\n{''.join(stderr_lines[-20:])}")
    return proc


# ── Processing functions ──────────────────────────────────────────────────────

def convert_video(video_bytes: bytes, target_format: str, progress_cb: Callable = None) -> bytes:
    """Convert video to target container format (mp4, avi, mkv, mov, webm)."""
    with tempfile.TemporaryDirectory() as d:
        in_path  = os.path.join(d, "input.bin")
        out_path = os.path.join(d, f"output.{target_format}")
        _write(in_path, video_bytes)
        dur = _get_duration(in_path)
        _progress(progress_cb, 15)
        _run_ffmpeg(["-i", in_path, "-c", "copy", out_path], dur, progress_cb)
        return _read(out_path)


def transcode_video(video_bytes: bytes, video_codec: str = "libx264", audio_codec: str = "aac",
                    crf: int = 23, preset: str = "fast", target_format: str = "mp4",
                    progress_cb: Callable = None) -> bytes:
    """Re-encode video with specified codecs and quality settings."""
    with tempfile.TemporaryDirectory() as d:
        in_path  = os.path.join(d, "input.bin")
        out_path = os.path.join(d, f"output.{target_format}")
        _write(in_path, video_bytes)
        dur = _get_duration(in_path)
        _progress(progress_cb, 10)
        args = [
            "-i", in_path,
            "-c:v", video_codec, "-crf", str(crf), "-preset", preset,
            "-c:a", audio_codec,
            out_path,
        ]
        _run_ffmpeg(args, dur, progress_cb)
        return _read(out_path)


def trim_video(video_bytes: bytes, start_sec: float, end_sec: float, progress_cb: Callable = None) -> bytes:
    """Trim video to [start, end] in seconds."""
    with tempfile.TemporaryDirectory() as d:
        in_path  = os.path.join(d, "input.bin")
        out_path = os.path.join(d, "trimmed.mp4")
        _write(in_path, video_bytes)
        dur = min(end_sec - start_sec, _get_duration(in_path))
        _progress(progress_cb, 10)
        args = [
            "-i", in_path,
            "-ss", str(start_sec),
            "-to", str(end_sec),
            "-c", "copy",
            out_path,
        ]
        _run_ffmpeg(args, dur, progress_cb)
        return _read(out_path)


def merge_videos(video_bytes_list: list[bytes], progress_cb: Callable = None) -> bytes:
    """Concatenate multiple videos into one."""
    with tempfile.TemporaryDirectory() as d:
        list_path = os.path.join(d, "list.txt")
        total_dur = 0.0
        with open(list_path, "w") as lf:
            for i, vb in enumerate(video_bytes_list):
                p = os.path.join(d, f"input_{i}.mp4")
                _write(p, vb)
                total_dur += _get_duration(p)
                lf.write(f"file '{p}'\n")
        _progress(progress_cb, 15)
        out_path = os.path.join(d, "merged.mp4")
        args = ["-f", "concat", "-safe", "0", "-i", list_path, "-c", "copy", out_path]
        _run_ffmpeg(args, total_dur, progress_cb)
        return _read(out_path)


def extract_audio(video_bytes: bytes, audio_format: str = "mp3", progress_cb: Callable = None) -> bytes:
    """Extract audio track from video."""
    with tempfile.TemporaryDirectory() as d:
        in_path  = os.path.join(d, "input.bin")
        out_path = os.path.join(d, f"audio.{audio_format}")
        _write(in_path, video_bytes)
        dur = _get_duration(in_path)
        _progress(progress_cb, 10)
        args = ["-i", in_path, "-vn", "-acodec", "libmp3lame" if audio_format == "mp3" else "copy", out_path]
        _run_ffmpeg(args, dur, progress_cb)
        return _read(out_path)


def normalize_audio(video_bytes: bytes, is_audio_only: bool = False, progress_cb: Callable = None) -> bytes:
    """Normalize audio loudness using FFmpeg loudnorm filter."""
    ext = "mp3" if is_audio_only else "mp4"
    with tempfile.TemporaryDirectory() as d:
        in_path  = os.path.join(d, "input.bin")
        out_path = os.path.join(d, f"normalized.{ext}")
        _write(in_path, video_bytes)
        dur = _get_duration(in_path)
        _progress(progress_cb, 10)
        af = "loudnorm=I=-23:TP=-1:LRA=11"
        if is_audio_only:
            args = ["-i", in_path, "-af", af, out_path]
        else:
            args = ["-i", in_path, "-af", af, "-c:v", "copy", out_path]
        _run_ffmpeg(args, dur, progress_cb)
        return _read(out_path)


def extract_frames(video_bytes: bytes, fps: float = 1.0, max_frames: int = 30,
                   img_format: str = "jpeg", progress_cb: Callable = None) -> list[bytes]:
    """Extract frames from video at given FPS."""
    with tempfile.TemporaryDirectory() as d:
        in_path = os.path.join(d, "input.bin")
        _write(in_path, video_bytes)
        dur = _get_duration(in_path)
        _progress(progress_cb, 15)
        pattern = os.path.join(d, f"frame_%04d.{img_format}")
        vf = f"fps={fps}"
        args = ["-i", in_path, "-vf", vf, pattern]
        _run_ffmpeg(args, dur, progress_cb)
        frames = sorted(glob.glob(os.path.join(d, f"*.{img_format}")))[:max_frames]
        result = [_read(f) for f in frames]
        _progress(progress_cb, 95)
        return result


def frames_to_video(frame_bytes_list: list[bytes], fps: float = 24.0, progress_cb: Callable = None) -> bytes:
    """Assemble list of image frames into an MP4 video."""
    with tempfile.TemporaryDirectory() as d:
        ext = "jpg"
        for i, fb in enumerate(frame_bytes_list):
            _write(os.path.join(d, f"frame_{i:06d}.{ext}"), fb)
        _progress(progress_cb, 30)
        pattern  = os.path.join(d, f"frame_%06d.{ext}")
        out_path = os.path.join(d, "output.mp4")
        args = ["-framerate", str(fps), "-i", pattern, "-c:v", "libx264", "-pix_fmt", "yuv420p", out_path]
        dur = len(frame_bytes_list) / fps
        _run_ffmpeg(args, dur, progress_cb)
        return _read(out_path)


def frames_to_gif(frame_bytes_list: list[bytes], fps: float = 10.0, width: int = 480,
                  progress_cb: Callable = None) -> bytes:
    """Assemble image frames into an animated GIF."""
    with tempfile.TemporaryDirectory() as d:
        ext = "jpg"
        for i, fb in enumerate(frame_bytes_list):
            _write(os.path.join(d, f"frame_{i:06d}.{ext}"), fb)
        _progress(progress_cb, 30)
        pattern  = os.path.join(d, f"frame_%06d.{ext}")
        out_path = os.path.join(d, "output.gif")
        vf = f"fps={fps},scale={width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
        args = ["-framerate", str(fps), "-i", pattern, "-vf", vf, out_path]
        dur = len(frame_bytes_list) / fps
        _run_ffmpeg(args, dur, progress_cb)
        return _read(out_path)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _write(path: str, data: bytes):
    with open(path, "wb") as f:
        f.write(data)


def _read(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def _progress(cb: Callable | None, pct: int):
    if cb:
        cb(pct)


# ── Job handler ───────────────────────────────────────────────────────────────

MIME_FOR_EXT = {
    "mp4": "video/mp4", "avi": "video/x-msvideo", "mkv": "video/x-matroska",
    "mov": "video/quicktime", "webm": "video/webm",
    "mp3": "audio/mpeg", "aac": "audio/aac", "wav": "audio/wav",
    "gif": "image/gif", "jpeg": "image/jpeg", "jpg": "image/jpeg", "png": "image/png",
}


def handle_video_job(doc: dict, progress_cb: Callable) -> list[dict]:
    from services.storage import get_file_bytes, upload_file_sync
    

    params  = doc.get("parameters", {})
    assets  = doc.get("inputAssets", [])
    sub_op  = doc.get("operation", "").split(".")[-1]
    user_id = doc.get("userId", "")

    if not assets:
        raise ValueError("No input assets")

    primary_bytes    = get_file_bytes(assets[0]["storageUrl"])
    source_filename  = assets[0].get("filename", "video.mp4")
    stem             = source_filename.rsplit(".", 1)[0]

    output_assets = []

    if sub_op == "convert":
        fmt    = params.get("format", "mp4")
        result = convert_video(primary_bytes, fmt, progress_cb)
        _emit(result, f"{stem}_converted.{fmt}", MIME_FOR_EXT.get(fmt, "video/mp4"), user_id, output_assets)

    elif sub_op == "transcode":
        fmt    = params.get("format", "mp4")
        result = transcode_video(
            primary_bytes,
            video_codec=params.get("video_codec", "libx264"),
            audio_codec=params.get("audio_codec", "aac"),
            crf=int(params.get("crf", 23)),
            preset=params.get("preset", "fast"),
            target_format=fmt,
            progress_cb=progress_cb,
        )
        _emit(result, f"{stem}_transcoded.{fmt}", MIME_FOR_EXT.get(fmt, "video/mp4"), user_id, output_assets)

    elif sub_op == "trim":
        result = trim_video(
            primary_bytes,
            start_sec=float(params.get("start", 0)),
            end_sec=float(params.get("end", 30)),
            progress_cb=progress_cb,
        )
        _emit(result, f"{stem}_trimmed.mp4", "video/mp4", user_id, output_assets)

    elif sub_op == "merge":
        all_bytes = [primary_bytes] + [get_file_bytes(a["storageUrl"]) for a in assets[1:]]
        result    = merge_videos(all_bytes, progress_cb)
        _emit(result, f"{stem}_merged.mp4", "video/mp4", user_id, output_assets)

    elif sub_op == "extract_audio":
        fmt    = params.get("format", "mp3")
        result = extract_audio(primary_bytes, fmt, progress_cb)
        _emit(result, f"{stem}_audio.{fmt}", MIME_FOR_EXT.get(fmt, "audio/mpeg"), user_id, output_assets)

    elif sub_op == "normalize_audio":
        is_audio = source_filename.rsplit(".", 1)[-1].lower() in ("mp3", "wav", "aac", "flac", "ogg")
        result   = normalize_audio(primary_bytes, is_audio_only=is_audio, progress_cb=progress_cb)
        ext      = "mp3" if is_audio else "mp4"
        _emit(result, f"{stem}_normalized.{ext}", MIME_FOR_EXT.get(ext, "video/mp4"), user_id, output_assets)

    elif sub_op == "extract_frames":
        frames = extract_frames(
            primary_bytes,
            fps=float(params.get("fps", 1.0)),
            max_frames=int(params.get("max_frames", 30)),
            img_format=params.get("img_format", "jpeg"),
            progress_cb=progress_cb,
        )
        fmt = params.get("img_format", "jpeg").replace("jpeg", "jpg")
        for i, fb in enumerate(frames):
            _emit(fb, f"{stem}_frame_{i+1:04d}.{fmt}", MIME_FOR_EXT.get(fmt, "image/jpeg"), user_id, output_assets)

    elif sub_op == "frames_to_video":
        all_bytes = [get_file_bytes(a["storageUrl"]) for a in assets]
        result    = frames_to_video(all_bytes, fps=float(params.get("fps", 24.0)), progress_cb=progress_cb)
        _emit(result, f"{stem}_video.mp4", "video/mp4", user_id, output_assets)

    elif sub_op == "frames_to_gif":
        all_bytes = [get_file_bytes(a["storageUrl"]) for a in assets]
        result    = frames_to_gif(
            all_bytes,
            fps=float(params.get("fps", 10.0)),
            width=int(params.get("width", 480)),
            progress_cb=progress_cb,
        )
        _emit(result, f"{stem}.gif", "image/gif", user_id, output_assets)

    else:
        raise ValueError(f"Unknown video sub-operation: {sub_op}")

    progress_cb(98)
    return output_assets


def _emit(data: bytes, filename: str, mime: str, user_id: str, output_list: list):
    """Upload file, save DB record, append to output list."""
    from services.storage import upload_file_sync
    
    storage = upload_file_sync(data, filename, mime)
    output_list.append({
        "filename": filename,
        "storageUrl": storage["storage_url"],
        "contentType": mime,
        "size": len(data),
    })
