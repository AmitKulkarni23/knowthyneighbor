'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithOtp } from '@/api/auth';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  });

  const email = watch('email');

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    const result = await signInWithOtp(data.email);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={styles.board}>
        <div className={styles.card}>
          <div className={styles.pin} />
          <h1 className={styles.title}>Check Your Email</h1>
          <p className={styles.subtitle}>
            We sent a magic link your way.
          </p>
          <p className={styles.confirmText}>
            Click the link we sent to <span className={styles.email}>{email}</span> to sign in.
          </p>
          <p className={styles.confirmHint}>No password needed.</p>
          <button
            type="button"
            className={styles.altBtn}
            onClick={() => setSubmitted(false)}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.board}>
      <div className={styles.card}>
        <div className={styles.pin} />
        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a magic link. No password needed.
        </p>

        {serverError && (
          <div className={styles.alert}>{serverError}</div>
        )}

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.fieldGroup}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              className={errors.email ? styles.inputError : styles.input}
              placeholder="you@example.com"
              autoFocus
              {...register('email')}
            />
            {errors.email && (
              <p className={styles.errorText}>{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <button
          type="button"
          className={styles.backLink}
          onClick={() => router.push('/')}
        >
          Back to home
        </button>
      </div>
    </div>
  );
}
