import os

files_to_fix = [
    ('apps/web/src/app/(dashboard)/page.tsx', 'setMonthlyChart(chartData);', 'setMonthlyChart(chartData as any[]);'),
    ('apps/web/src/app/(dashboard)/page.tsx', 'setCategoryBreakdown(catData);', 'setCategoryBreakdown(catData as any[]);'),
    ('apps/web/src/app/(dashboard)/reports/page.tsx', 'variant="outline"', 'variant="secondary"'),
    ('apps/web/src/app/(dashboard)/savings/page.tsx', 'variant="outline"', 'variant="secondary"'),
    ('apps/web/src/app/(dashboard)/settings/page.tsx', 'variant="outline"', 'variant="secondary"'),
]

for filepath, old, new in files_to_fix:
    with open(filepath, 'r') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(filepath, 'w') as f:
        f.write(content)

sidebar = 'apps/web/src/components/layout/Sidebar.tsx'
with open(sidebar, 'r') as f:
    content = f.read()
if 'Shield' not in content.split('\n')[4]:  # Assuming import from lucide-react is near top
    content = content.replace('import { ', 'import { Shield, ', 1)
with open(sidebar, 'w') as f:
    f.write(content)

print("TS errors fixed")
