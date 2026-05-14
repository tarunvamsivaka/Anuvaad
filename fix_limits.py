import re

with open('main.py', 'r') as f:
    content = f.read()

# 1. Update check_free_tier_limit definition
old_def = 'async def check_free_tier_limit(email: str | None, is_pro: bool) -> None:'
new_def = '''async def check_free_tier_limit(request: Request, email: str | None, is_pro: bool) -> None:
    \"\"\"Raise 429 if a free-tier user has exceeded their daily limit and has no credits.\"\"\"
    if is_pro:
        return  # Pro users have unlimited translations
        
    if not email:
        client_ip = request.client.host if request.client else "127.0.0.1"
        anon_key = f"daily_anon_usage:{client_ip}"
        count = await cache.incr_rate_limit(anon_key, 86400)
        if count > FREE_TIER_DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Free tier limit reached ({FREE_TIER_DAILY_LIMIT} translations/day). Create an account or upgrade to Pro for unlimited translations."
            )
        return'''

content = re.sub(
    r'async def check_free_tier_limit\(email: str \| None, is_pro: bool\) -> None:.*?return  # Pro users have unlimited translations',
    new_def,
    content,
    flags=re.DOTALL
)

# 2. Update upload_file_translate
content = content.replace(
    'async def upload_file_translate(\n    file: UploadFile = File(...),\n',
    'async def upload_file_translate(\n    request: Request,\n    file: UploadFile = File(...),\n'
)

# 3. Update the other function definitions
functions = [
    'async def function_translate_to_english_stream(',
    'async def function_translate_to_english(',
    'async def function_generate_from_english(',
    'async def function_code_to_code('
]
for func in functions:
    content = content.replace(func, func.replace('(', '(request: Request, '))

# 4. Update the calls to check_free_tier_limit
content = content.replace(
    'await check_free_tier_limit(email, is_pro)',
    'await check_free_tier_limit(request, email, is_pro)'
)

# 5. Fix an extra indent or missing request on if not email: block where check is placed if we want to call it for anon users.
# Wait, check_free_tier_limit is currently wrapped in if email: inside the endpoints.
# We must remove the if email: wrapper so it runs for anonymous users too!
old_call = '''    if email:
        await check_free_tier_limit(request, email, is_pro)'''
new_call = '''    await check_free_tier_limit(request, email, is_pro)'''
content = content.replace(old_call, new_call)

old_call2 = '''    if email:
        is_pro = await get_user_pro_status(email)
        await check_free_tier_limit(request, email, is_pro)'''
new_call2 = '''    if email:
        is_pro = await get_user_pro_status(email)
    await check_free_tier_limit(request, email, is_pro)'''
content = content.replace(old_call2, new_call2)

with open('main.py', 'w') as f:
    f.write(content)

print("Updated main.py")
