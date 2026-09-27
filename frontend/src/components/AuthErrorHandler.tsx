'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthErrorHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('error=')) return;

    const params = new URLSearchParams(hash.slice(1));
    const errorCode = params.get('error_code');
    const errorDesc = params.get('error_description');

    if (!errorCode && !errorDesc) return;

    const message =
      errorCode === 'otp_expired' || errorDesc?.toLowerCase().includes('expired')
        ? 'link_expired'
        : 'auth_error';

    // Only redirect if we're not already on /login
    if (pathname !== '/login') {
      router.replace(`/login?error=${message}`);
    } else {
      window.history.replaceState(null, '', `/login?error=${message}`);
      window.dispatchEvent(new Event('authError'));
    }
  }, [router, pathname]);

  return null;
}
