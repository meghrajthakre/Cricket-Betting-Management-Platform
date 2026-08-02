const MainLayout = ({ children, title, subtitle }) => {
    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.14),_transparent_24%),linear-gradient(135deg,#020617_0%,#111827_45%,#172554_100%)] text-slate-100">
            <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <header className="mb-8 flex items-center justify-between rounded-3xl border border-white/10 bg-white/6 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
                    <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-indigo-200/90">Support Hub</p>
                        <h1 className="text-xl font-semibold text-white sm:text-2xl">{title}</h1>
                        {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
                    </div>
                    <div className="rounded-full border border-indigo-400/60 bg-indigo-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-indigo-100">Scalable React</div>
                </header>

                {children}
            </section>
        </main>
    );
};

export default MainLayout;
