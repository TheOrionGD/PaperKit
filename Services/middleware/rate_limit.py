"""Rate limiting middleware for API usage"""
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, status
from database import get_db
from middleware.auth import get_current_user

# Max 5 AI requests per hour
MAX_AI_REQUESTS_PER_HOUR = 5

async def check_ai_rate_limit(current_user: dict = Depends(get_current_user)):
    """
    Dependency to limit AI feature usage to a specific threshold per hour.
    Applies per user_id.
    """
    db = get_db()
    if db is None:
        # If DB is not available, we can't track usage securely, so we allow it but log a warning
        return current_user
        
    user_id = str(current_user["_id"])
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    
    # Count the user's AI requests in the last hour
    usage_count = await db.ai_usage_logs.count_documents({
        "user_id": user_id,
        "timestamp": {"$gte": one_hour_ago}
    })
    
    if usage_count >= MAX_AI_REQUESTS_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. You can use up to 5 AI features per hour. Please wait before trying again."
        )
        
    # Log this new request
    await db.ai_usage_logs.insert_one({
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    return current_user
