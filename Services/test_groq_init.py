import sys, os
services_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, services_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(services_dir, ".env"))

from config import get_settings
s = get_settings()
print("Settings groq_api_key:", repr(s.groq_api_key[:15]) if s.groq_api_key else "EMPTY")

from services import ai_service
client = ai_service.get_groq_client()
print("ai_service client:", client)
