import { MoonStar, Sun } from 'lucide-react';

import Button from '../ui/Button';

const ThemeToggle = ({ isDark, onToggle }) => {
    return (
        <Button
            type="button"
            variant="ghost"
            className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
            onClick={onToggle}
            aria-label="Toggle theme"
        >
            {isDark ? <Sun className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>
    );
};

export default ThemeToggle;
