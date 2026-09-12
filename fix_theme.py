import os
import re

directories = [
    'apps/web/src/app/(dashboard)',
    'apps/web/src/components'
]

replacements = {
    r'bg-slate-900/50': 'bg-bg-card',
    r'bg-slate-900/60': 'bg-bg-card',
    r'bg-slate-900/30': 'bg-bg-card',
    r'bg-slate-800/50': 'bg-bg-card',
    r'bg-slate-800/30': 'bg-bg-card',
    r'bg-slate-800/20': 'bg-bg-card',
    r'bg-slate-900': 'bg-bg-card',
    r'bg-slate-800': 'bg-bg-secondary',
    r'bg-slate-700': 'bg-bg-secondary',
    r'border-white/5': 'border-border',
    r'border-white/10': 'border-border',
    r'border-slate-100': 'border-border',
    r'text-white': 'text-text-primary',
    r'text-slate-200': 'text-text-primary',
    r'text-slate-300': 'text-text-secondary',
    r'text-slate-400': 'text-text-muted',
    r'text-slate-500': 'text-text-muted',
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        # Match whole words to avoid partial replacement e.g. text-white/50
        # Wait, text-white/5 is not whole word for \b. 
        # I'll just use simple replace since these exact strings are what we use.
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for d in directories:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

print("Done")
