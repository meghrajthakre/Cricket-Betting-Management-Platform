import { Toaster } from 'react-hot-toast';

import AuthProvider from '../features/auth/context/AuthProvider';
import AppRoutes from './routes/AppRoutes';
import ScrollToTop from '../shared/components/common/ScrollToTop';

const App = () => {
    return (
        <AuthProvider>
            <ScrollToTop />
            <AppRoutes />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    className: 'border border-white/10 bg-slate-900 text-slate-100 shadow-xl',
                }}
            />
        </AuthProvider>
    );
};

export default App;
