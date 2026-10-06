const fs = require('fs');
let c = fs.readFileSync('src/components/dashboard/__tests__/DashboardOverview.test.tsx', 'utf8');
c = c.replace(/const urgentBtn = screen.getByText\(\/Срочные\/\)/, "const urgentBtn = screen.getByRole('button', { name: /Срочные/i })");
c = c.replace(/it\('toggles task completion and updates productivity stats', \(\) => \{/, "it('toggles task completion and updates productivity stats', async () => {");
c = c.replace(/fireEvent.click\(firstCheckbox\)\n\s+expect\(firstCheckbox\).toHaveAttribute\('aria-checked', 'true'\)/, "fireEvent.click(firstCheckbox)\n    await new Promise(r => setTimeout(r, 0))\n    expect(firstCheckbox).toHaveAttribute('aria-checked', 'true')");
c = c.replace(/import \{ describe, it, expect, beforeEach \} from 'vitest'/, "import { describe, it, expect, beforeEach, vi } from 'vitest'");
c = c.replace(/useAppStore.setState\(\{ items: SEED_ITEMS \}\)/, "useAppStore.setState({ items: SEED_ITEMS, toggleTask: vi.fn().mockImplementation(async (id) => { const items = useAppStore.getState().items; useAppStore.setState({ items: items.map(i => i.id === id ? { ...i, status: i.status === 'completed' ? 'todo' : 'completed' } : i) }) }) })");
fs.writeFileSync('src/components/dashboard/__tests__/DashboardOverview.test.tsx', c, 'utf8');
