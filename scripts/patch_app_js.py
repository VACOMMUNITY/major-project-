with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add role: "student" inside profile object in callTransportService
old_chunk1 = """        role: "student",
        profile: {
          user_id: `test-mvsr-student-${suffix}`,"""
new_chunk1 = """        role: "student",
        profile: {
          role: "student",
          user_id: `test-mvsr-student-${suffix}`,"""

# 2. Update renderDashboard to check isSupabaseConfigured()
old_chunk2 = """  if (protectedRole) {
    try {
      const { data: sessionData } = await getSupabaseClient().auth.getSession();"""

new_chunk2 = """  if (protectedRole && isSupabaseConfigured()) {
    try {
      const { data: sessionData } = await getSupabaseClient().auth.getSession();"""

# 3. Update logout button
old_chunk3 = """    button.addEventListener("click", async () => {
      if (protectedRole) {"""

new_chunk3 = """    button.addEventListener("click", async () => {
      if (protectedRole && isSupabaseConfigured()) {"""

# Replace (handling \r\n and \n)
content_normalized = content.replace('\r\n', '\n')
assert old_chunk1 in content_normalized, "chunk 1 not found"
assert old_chunk2 in content_normalized, "chunk 2 not found"
assert old_chunk3 in content_normalized, "chunk 3 not found"

content_normalized = content_normalized.replace(old_chunk1, new_chunk1, 1)
content_normalized = content_normalized.replace(old_chunk2, new_chunk2, 1)
content_normalized = content_normalized.replace(old_chunk3, new_chunk3, 1)

# Write back with CRLF
with open(r'c:\Users\paidi\OneDrive\Attachments\Desktop - Copy\major project\ui\assets\app.js', 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content_normalized)

print("SUCCESS: app.js patched successfully")
