import clsx from 'clsx';

const Input = ({
    label,
    id,
    name,
    type = 'text',
    error,
    icon,
    rightElement,
    className,
    ...props
}) => {
    const inputId = id ?? name;

    return (
        <label htmlFor={inputId} className="block text-left text-sm text-slate-700 dark:text-slate-200">
            {label ? <span className="mb-1.5 block font-medium">{label}</span> : null}

            <div className="relative">
                {icon ? <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{icon}</span> : null}

                <input
                    id={inputId}
                    name={name}
                    type={type}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    className={clsx(
                        'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:placeholder:text-slate-500',
                        icon && 'pl-10',
                        error && 'border-rose-400 focus:border-rose-400 focus:ring-rose-200',
                        className,
                    )}
                    {...props}
                />

                {rightElement ? <span className="absolute inset-y-0 right-3 flex items-center">{rightElement}</span> : null}
            </div>

            {error ? (
                <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs text-rose-500">
                    {error}
                </p>
            ) : null}
        </label>
    );
};

export default Input;
