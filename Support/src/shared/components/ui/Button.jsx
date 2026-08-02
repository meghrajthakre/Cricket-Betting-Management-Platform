import clsx from 'clsx';

const Button = ({
    children,
    className,
    variant = 'primary',
    loading = false,
    disabled = false,
    type = 'button',
    ...props
}) => {
    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20',
        secondary: 'bg-white/90 text-slate-900 hover:bg-white border border-slate-200',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800',
    };

    return (
        <button
            type={type}
            className={clsx(
                'inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70',
                variants[variant],
                className,
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? 'Please wait…' : children}
        </button>
    );
};

export default Button;
