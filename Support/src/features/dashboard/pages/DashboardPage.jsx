import { Bell, LogOut, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

import Button from '../../../shared/components/ui/Button';
import MainLayout from '../../../app/layouts/MainLayout';
import useAuth from '../../auth/hooks/useAuth';
import { DASHBOARD_STATS } from '../../../shared/constants/app';

const DashboardPage = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        toast.success('You have been signed out.');
    };

    return (
        <MainLayout title="Dashboard" subtitle="A clean overview for your support operations.">
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <article className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Overview</p>
                            <h2 className="mt-2 text-2xl font-semibold text-white">Good morning, {user?.name ?? 'Support lead'}.</h2>
                            <p className="mt-3 max-w-xl text-sm text-slate-200">Your support workspace is live with protected routes, reusable components, and a scalable layout ready for growth.</p>
                        </div>
                        <Button variant="secondary" onClick={handleLogout} className="gap-2 rounded-full border-white/10 bg-white/10 text-slate-100 hover:bg-white/20">
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Button>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        {DASHBOARD_STATS.map((item) => (
                            <article key={item.label} className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/30">
                                <span className="text-xs uppercase tracking-[0.35em] text-indigo-200">{item.label}</span>
                                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                                <p className="mt-2 text-xs text-slate-300">{item.trend}</p>
                            </article>
                        ))}
                    </div>
                </article>

                <article className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Team</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">Current priorities</h3>
                        </div>
                        <Bell className="h-5 w-5 text-indigo-200" />
                    </div>

                    <div className="mt-6 space-y-4">
                        {[
                            { title: 'Billing escalations', detail: '3 tickets need follow-up within the next hour.' },
                            { title: 'Agent handover', detail: 'Shift notes synced across the team dashboard.' },
                            { title: 'Resolution ratio', detail: 'Weekly SLA target remains above 92%.' },
                        ].map((item) => (
                            <article key={item.title} className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/30">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                                        <p className="mt-1 text-sm text-slate-300">{item.detail}</p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </article>
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                <article className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Account</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">Profile summary</h3>
                        </div>
                        <Sparkles className="h-5 w-5 text-indigo-200" />
                    </div>
                    <div className="mt-6 flex items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-lg font-semibold text-indigo-100">{(user?.name ?? 'S').charAt(0)}</div>
                        <div>
                            <p className="text-base font-semibold text-white">{user?.name ?? 'Support user'}</p>
                            <p className="text-sm text-slate-300">{user?.email ?? 'Manage your workspace from here.'}</p>
                        </div>
                    </div>
                </article>

                <article className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.35em] text-indigo-200">Operations</p>
                            <h3 className="mt-2 text-xl font-semibold text-white">Highlights</h3>
                        </div>
                        <Users className="h-5 w-5 text-indigo-200" />
                    </div>
                    <ul className="mt-6 space-y-3 text-sm text-slate-200">
                        <li className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">Axios interceptors keep auth state in sync with local storage.</li>
                        <li className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">React Hook Form and Zod provide reusable, accessible validation.</li>
                        <li className="rounded-3xl border border-white/10 bg-slate-950/60 p-4">Tailwind-powered components make the dashboard responsive and scalable.</li>
                    </ul>
                </article>
            </section>
        </MainLayout>
    );
};

export default DashboardPage;
