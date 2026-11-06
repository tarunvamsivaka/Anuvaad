import re

def update_zustand_shallow(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # Add import
    if "zustand/react/shallow" not in content:
        content = content.replace(
            'import { useTranslationStore } from "../../_store/useTranslationStore";',
            'import { useTranslationStore } from "../../_store/useTranslationStore";\nimport { useShallow } from "zustand/react/shallow";'
        )
        content = content.replace(
            'import { useTranslationStore } from "../_store/useTranslationStore";',
            'import { useTranslationStore } from "../_store/useTranslationStore";\nimport { useShallow } from "zustand/react/shallow";'
        )

    # Find the destructuring pattern
    pattern = r'const\s+\{\s*([\s\S]*?)\s*\}\s*=\s*useTranslationStore\(\);'

    def replacer(match):
        props_str = match.group(1)
        props = [p.strip() for p in props_str.split(',') if p.strip()]

        # Build the object return string for useShallow
        obj_props = ", ".join([f"{p}: state.{p}" for p in props])
        return f"const {{\n    {props_str}\n  }} = useTranslationStore(useShallow((state) => ({{\n    {obj_props}\n  }})));"

    content = re.sub(pattern, replacer, content)

    with open(filepath, "w") as f:
        f.write(content)

files = [
    "frontend/src/features/translate/_components/InputPanel/index.tsx",
    "frontend/src/features/translate/_components/OutputPanel/index.tsx",
    "frontend/src/features/translate/_hooks/useTranslationSession.ts",
    "frontend/src/features/translate/_hooks/useTranslationStream.ts",
    "frontend/src/features/translate/_hooks/useFileImport.ts",
]

for f in files:
    update_zustand_shallow(f)
