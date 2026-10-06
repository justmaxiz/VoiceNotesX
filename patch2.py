import re

with open('d:/relax/projects/voicenotes/src/components/dashboard/DashboardOverview.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"const isToday = i\.dueDate === todayStr\s+const isOverdue = i\.dueDate && i\.dueDate < todayStr && i\.status !== 'completed'\s+return isToday \|\| isOverdue",
    "return true",
    content
)

with open('d:/relax/projects/voicenotes/src/components/dashboard/DashboardOverview.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
