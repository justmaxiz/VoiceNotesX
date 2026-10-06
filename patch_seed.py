import re
import datetime

with open('d:/relax/projects/voicenotes/src/lib/seedData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace dueDate: 'HH:MM' with dueTime: 'HH:MM', dueDate: 'YYYY-MM-DD'
# Use the current date for today so they show up as today's tasks
today = datetime.date.today().isoformat()
tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()

content = re.sub(r"dueDate:\s*'(\d{2}:\d{2})'", rf"dueTime: '\1', dueDate: '{today}'", content)
content = content.replace("dueDate: 'Завтра'", f"dueDate: '{tomorrow}'")

with open('d:/relax/projects/voicenotes/src/lib/seedData.ts', 'w', encoding='utf-8') as f:
    f.write(content)
