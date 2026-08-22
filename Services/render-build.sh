#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Starting build process..."

# Install Python dependencies
pip install -r requirements.txt

# Download and extract ffmpeg static binary
echo "Downloading ffmpeg static binary..."
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz

# Create bin directory and move binaries
mkdir -p bin
cp ffmpeg-*-static/ffmpeg bin/
cp ffmpeg-*-static/ffprobe bin/

# Clean up archive and extracted folder
rm -rf ffmpeg-release-amd64-static.tar.xz ffmpeg-*-static

echo "Build process completed successfully."
