import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

print("Testing select of user_email and workspace_id...")
url = f"{SUPABASE_URL}/rest/v1/translation_history?select=user_email,workspace_id"
resp = httpx.get(url, headers=headers)
print(f"Status Code: {resp.status_code}")
print(f"Response: {resp.text}")

print("\nTesting filter: workspace_id=is.null...")
url_filter = f"{SUPABASE_URL}/rest/v1/translation_history?workspace_id=is.null&select=*"
resp_filter = httpx.get(url_filter, headers=headers)
print(f"Status Code: {resp_filter.status_code}")
print(f"Response: {resp_filter.text}")
