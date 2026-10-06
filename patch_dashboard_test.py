import re

with open('d:/relax/projects/voicenotes/src/components/dashboard/__tests__/DashboardOverview.test.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"const urgentBtn = screen\.getByRole\('button', \{ name: /Срочные.*?/i \}\)", "const urgentBtn = screen.getAllByRole('button', { name: /Срочные/i })[0]", content)

with open('d:/relax/projects/voicenotes/src/components/dashboard/__tests__/DashboardOverview.test.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
