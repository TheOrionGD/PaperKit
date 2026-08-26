import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('o:/PROJECTS/College/PaperKit/Services/.env')

async def main():
    url = os.getenv('MONGODB_URL')
    if not url:
        print("MONGODB_URL not found in .env")
        return
        
    client = AsyncIOMotorClient(url)
    db_name = os.getenv('DATABASE_NAME', 'paperkit')
    db = client[db_name]
    
    collections = await db.list_collection_names()
    for coll in collections:
        print(f"Dropping collection {coll}...")
        await db[coll].drop()
        
    print(f"MongoDB Atlas database '{db_name}' cleared.")

if __name__ == "__main__":
    asyncio.run(main())
