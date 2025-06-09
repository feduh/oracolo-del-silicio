// lib/cn.ts
// Utility per unire le classi CSS (Tailwind)
// Usata in numerosi componenti per costruire stringhe di classi condizionali.
export const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');
