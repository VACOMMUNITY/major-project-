with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'login' in line.lower() and ('function' in line or 'handle' in line or 'submit' in line or 'addeventlistener' in line.lower()):
            print(f"{i+1}: {line.strip()[:100]}")
