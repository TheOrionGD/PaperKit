"""Async MongoDB client using Motor, with fallback to file-backed JSON Mock database for local dev"""
import os
import json
import asyncio
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from config import get_settings

settings = get_settings()

# --- Mock Database Implementation ---

class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id

class UpdateResult:
    def __init__(self, matched_count, modified_count):
        self.matched_count = matched_count
        self.modified_count = modified_count

class MockCursor:
    def __init__(self, items, sort=None, skip_val=0, limit_val=None):
        self.items = items
        self.sort_criteria = sort
        self.skip_val = skip_val
        self.limit_val = limit_val
        self._index = 0
        self._processed = None

    def skip(self, n):
        self.skip_val = n
        return self

    def sort(self, sort_criteria):
        self.sort_criteria = sort_criteria
        return self

    def limit(self, n):
        self.limit_val = n
        return self

    def _get_processed_items(self):
        if self._processed is not None:
            return self._processed
        items = list(self.items)
        if self.sort_criteria:
            for field, order in reversed(self.sort_criteria):
                # order can be 1 (asc) or -1 (desc)
                reverse = (order == -1)
                # handle missing keys safely, using a default value for sorting
                def get_sort_key(x):
                    val = x.get(field)
                    if val is None:
                        return datetime.min if "date" in field or "created" in field else ""
                    return val
                items.sort(key=get_sort_key, reverse=reverse)
        
        if self.skip_val:
            items = items[self.skip_val:]
        if self.limit_val is not None:
            items = items[:self.limit_val]
        self._processed = items
        return self._processed

    def __aiter__(self):
        self._get_processed_items()
        self._index = 0
        return self

    async def __anext__(self):
        items = self._get_processed_items()
        if self._index >= len(items):
            raise StopAsyncIteration
        val = items[self._index]
        self._index += 1
        return val

def _serialize_val(val):
    if isinstance(val, ObjectId):
        return {"$oid": str(val)}
    if isinstance(val, datetime):
        return {"$date": val.isoformat()}
    if isinstance(val, list):
        return [_serialize_val(item) for item in val]
    if isinstance(val, dict):
        return {k: _serialize_val(v) for k, v in val.items()}
    return val

def _deserialize_val(val):
    if isinstance(val, dict):
        if "$oid" in val:
            return ObjectId(val["$oid"])
        if "$date" in val:
            return datetime.fromisoformat(val["$date"])
        return {k: _deserialize_val(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_deserialize_val(item) for item in val]
    return val

class MockCollection:
    def __init__(self, name, db):
        self.name = name
        self.db = db

    def _get_data(self):
        return self.db._data.setdefault(self.name, [])

    def _save(self):
        self.db.save_db()

    def _matches(self, doc, query):
        for k, v in query.items():
            if doc.get(k) != v:
                return False
        return True

    async def find_one(self, query):
        for doc in self._get_data():
            if self._matches(doc, query):
                return doc
        return None

    def find(self, query, sort=None):
        matching = [doc for doc in self._get_data() if self._matches(doc, query)]
        return MockCursor(matching, sort=sort)

    async def insert_one(self, doc):
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self._get_data().append(doc)
        self._save()
        return InsertOneResult(doc["_id"])

    async def delete_one(self, query):
        for i, doc in enumerate(self._get_data()):
            if self._matches(doc, query):
                self._get_data().pop(i)
                self._save()
                
                class DeleteResult:
                    def __init__(self, deleted_count):
                        self.deleted_count = deleted_count
                return DeleteResult(1)
                
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        return DeleteResult(0)

    async def delete_many(self, query):
        count = 0
        new_data = []
        for doc in self._get_data():
            if self._matches(doc, query):
                count += 1
            else:
                new_data.append(doc)
        
        if count > 0:
            self.db._data[self.name] = new_data
            self._save()
            
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
                
        return DeleteResult(count)

    async def update_one(self, query, update):
        matched = 0
        modified = 0
        for doc in self._get_data():
            if self._matches(doc, query):
                matched += 1
                if "$set" in update:
                    for k, v in update["$set"].items():
                        doc[k] = v
                        modified += 1
                self._save()
                break
        return UpdateResult(matched, modified)

    async def count_documents(self, query):
        count = 0
        for doc in self._get_data():
            if self._matches(doc, query):
                count += 1
        return count

class MockDatabase:
    def __init__(self, file_path):
        self.file_path = file_path
        self._data = {}
        self.load_db()

    def load_db(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                self._data = _deserialize_val(raw)
            except Exception as e:
                print(f"Error loading mock database: {e}")
                self._data = {}
        else:
            self._data = {}

    def save_db(self):
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        try:
            raw = _serialize_val(self._data)
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(raw, f, indent=2)
        except Exception as e:
            print(f"Error saving mock database: {e}")

    def __getattr__(self, name):
        return MockCollection(name, self)

    def __getitem__(self, name):
        return MockCollection(name, self)

class MockDatabaseClient:
    def __init__(self, file_path):
        self.database = MockDatabase(file_path)

    def __getitem__(self, name):
        return self.database

    def close(self):
        pass

# --- Client initialization logic ---

_client = None

def get_client():
    global _client
    if _client is None:
        if settings.mongodb_url.startswith("mock://"):
            storage_dir = os.path.join(os.path.dirname(__file__), "storage")
            db_path = os.path.join(storage_dir, "mock_db.json")
            _client = MockDatabaseClient(db_path)
        else:
            _client = AsyncIOMotorClient(settings.mongodb_url)
    return _client

def get_db():
    client = get_client()
    if isinstance(client, MockDatabaseClient):
        return client.database
    return client[settings.database_name]

async def close_client():
    global _client
    if _client is not None:
        _client.close()
        _client = None
