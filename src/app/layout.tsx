'use client';

import { Montserrat } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { pb } from '@/lib/pb';

const montserrat = Montserrat({ subsets: ['latin'] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const isLoginPage = pathname === '/login';

    useEffect(() => {
        setHasMounted(true);
        
        const checkAuth = () => {
            if (!pb.authStore.isValid && !isLoginPage) {
                router.push('/login');
                setAuthorized(false);
            } else {
                // Role-based redirection and authorization
                const user = pb.authStore.model;
                const isAttendant = user && user.role === 'attendant';
                const allowedAttendantPaths = ['/pdv', '/login'];
                
                if (isAttendant && !allowedAttendantPaths.includes(pathname)) {
                    router.push('/pdv');
                    setAuthorized(false); // Block rendering of the restricted page
                } else {
                    setAuthorized(true);
                }
            }
        };

        checkAuth();
        
        // Listen for auth changes
        return pb.authStore.onChange(() => {
            checkAuth();
        });
    }, [pathname, isLoginPage, router]);

    // Prevent hydration mismatch by returning a simple shell during server rendering
    if (!hasMounted) {
        return (
            <html lang="pt-BR">
                <body className={`${montserrat.className} bg-black`}>
                    <main className="h-screen w-full bg-black" />
                </body>
            </html>
        );
    }

    return (
        <html lang="pt-BR">
            <body className={`${montserrat.className} flex h-screen overflow-hidden bg-black text-[#F9F9F9] selection:bg-[#E85002] selection:text-white`}>
                {!isLoginPage && authorized && <Sidebar />}
                {/* Main Content */}
                <main className="flex-1 flex flex-col h-screen overflow-hidden bg-black">
                    {isLoginPage || authorized ? children : null}
                </main>
            </body>
        </html>
    );
}
