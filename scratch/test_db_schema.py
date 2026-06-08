import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
}

print("Querying OpenAPI schema...")
url = f"{SUPABASE_URL}/rest/v1/"
resp = httpx.get(url, headers=headers)
print(f"Status Code: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    definitions = data.get("definitions", {})
    for table_name, table_def in definitions.items():
        if "user_subscriptions" in table_name or "translation_history" in table_name:
            print(f"\nTable: {table_name}")
            properties = table_def.get("properties", {})
            for col, col_def in properties.items():
                print(f"  - {col}: {col_def.get('type')} (format: {col_def.get('format')})")
else:
    print(resp.text)
