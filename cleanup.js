const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'apps/web/src/app/(dashboard)/reports/page.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  [/bg-white\s+dark:bg-bg-card/g, 'bg-bg-card'],
  [/bg-white/g, 'bg-bg-card'],
  [/bg-slate-50\s+dark:bg-bg-secondary/g, 'bg-bg-secondary'],
  [/bg-slate-50\/50\s+dark:bg-bg-secondary\/30/g, 'bg-bg-secondary/30'],
  [/bg-slate-50/g, 'bg-bg-secondary'],
  [/bg-slate-100\s+dark:bg-bg-secondary/g, 'bg-bg-secondary'],
  [/bg-slate-100/g, 'bg-bg-secondary'],
  [/border-slate-100\s+dark:border-border/g, 'border-border'],
  [/border-slate-100/g, 'border-border'],
  [/border-slate-200\s+dark:border-border\/50/g, 'border-border/50'],
  [/border-slate-200\s+dark:border-border/g, 'border-border'],
  [/border-slate-200/g, 'border-border'],
  [/text-slate-800\s+dark:text-text-primary/g, 'text-text-primary'],
  [/text-slate-800/g, 'text-text-primary'],
  [/text-slate-600\s+dark:text-text-secondary/g, 'text-text-secondary'],
  [/text-slate-600/g, 'text-text-secondary'],
  [/text-slate-500\s+dark:text-text-muted/g, 'text-text-muted'],
  [/text-slate-500/g, 'text-text-muted'],
  [/text-slate-400\s+dark:text-text-muted/g, 'text-text-muted'],
  [/text-slate-400/g, 'text-text-muted'],
  [/hover:bg-slate-50\s+dark:hover:bg-bg-secondary/g, 'hover:bg-bg-secondary'],
  [/hover:bg-slate-100\s+dark:hover:bg-bg-secondary/g, 'hover:bg-bg-secondary'],
  [/hover:bg-slate-50/g, 'hover:bg-bg-secondary'],
  [/hover:bg-slate-100/g, 'hover:bg-bg-secondary'],
  [/divide-slate-100\s+dark:divide-border\/50/g, 'divide-border/50'],
  [/divide-slate-100/g, 'divide-border/50'],
];

replacements.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

fs.writeFileSync(file, content);
console.log('Done!');
