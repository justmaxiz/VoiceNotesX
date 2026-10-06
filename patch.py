import re

with open('d:/relax/projects/voicenotes/src/components/dashboard/__tests__/DashboardOverview.test.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "expect(screen.getByText('Недавние аудиозаписи')).toBeInTheDocument()",
    "expect(screen.getByRole('heading', { name: /Недавние аудиозаписи/i })).toBeInTheDocument()"
)
content = content.replace(
    "expect(screen.getByText('Сводка дня')).toBeInTheDocument()",
    "expect(screen.getByRole('heading', { name: /Сводка дня/i })).toBeInTheDocument()"
)
content = content.replace(
    "const playBtn = screen.getByLabelText('Воспроизвести')",
    "const playBtn = screen.getAllByLabelText(/Воспроизвести/i)[0]"
)
content = content.replace(
    "expect(screen.getByLabelText('Приостановить')).toBeInTheDocument()",
    "expect(screen.getAllByLabelText(/Приостановить/i)[0]).toBeInTheDocument()"
)
content = content.replace(
    "fireEvent.click(screen.getByLabelText('Приостановить'))",
    "fireEvent.click(screen.getAllByLabelText(/Приостановить/i)[0])"
)
content = content.replace(
    "expect(screen.getByLabelText('Воспроизвести')).toBeInTheDocument()",
    "expect(screen.getAllByLabelText(/Воспроизвести/i)[0]).toBeInTheDocument()"
)

# Add waitFor import
if "import { waitFor } from '@testing-library/react'" not in content:
    content = content.replace(
        "import { render, screen, fireEvent } from '@testing-library/react'",
        "import { render, screen, fireEvent, waitFor } from '@testing-library/react'"
    )

content = content.replace(
    "it('toggles task completion and updates productivity stats', () => {",
    "it('toggles task completion and updates productivity stats', async () => {"
)
content = content.replace(
    "expect(firstCheckbox).toHaveAttribute('aria-checked', 'true')",
    "await waitFor(() => expect(firstCheckbox).toHaveAttribute('aria-checked', 'true'))"
)
content = content.replace(
    "const urgentBtn = screen.getByText(/Срочные/)",
    "const urgentBtn = screen.getByRole('button', { name: 'Срочные 1' })"
)

with open('d:/relax/projects/voicenotes/src/components/dashboard/__tests__/DashboardOverview.test.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
