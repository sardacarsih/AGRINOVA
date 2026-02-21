import os
import re

# Define the base directory
base_dir = r"e:\agrinova\apps\web\lib"

# Files to process
files_to_fix = [
    r"e:\agrinova\apps\web\lib\utils\lazy-loading.tsx",
    r"e:\agrinova\apps\web\lib\types\notifications.ts",
    r"e:\agrinova\apps\web\lib\services\performance-monitor.ts",
    r"e:\agrinova\apps\web\lib\services\language-preference-service.ts",
    r"e:\agrinova\apps\web\lib\monitoring\types.ts",
    r"e:\agrinova\apps\web\lib\debug\hooks-debugger.tsx",
]

def fix_html_entities(file_path):
    """Replace HTML entities with proper quotes"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace HTML entities
        original_content = content
        content = content.replace('&apos;', "'")
        content = content.replace('&quot;', '"')
        content = content.replace('&lt;', '<')
        content = content.replace('&gt;', '>')
        content = content.replace('&amp;', '&')
        
        # Only write if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ Fixed: {file_path}")
            return True
        else:
            print(f"- No changes needed: {file_path}")
            return False
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False

# Process all files
print("Starting HTML entity replacement...")
print("=" * 60)

fixed_count = 0
for file_path in files_to_fix:
    if os.path.exists(file_path):
        if fix_html_entities(file_path):
            fixed_count += 1
    else:
        print(f"✗ File not found: {file_path}")

print("=" * 60)
print(f"Completed! Fixed {fixed_count} files.")
