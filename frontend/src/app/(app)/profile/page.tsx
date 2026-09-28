'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import { useAppContext } from '@/components/AppProvider';
import { getProfile, updateProfile } from '@/api/profiles';
import { updateCouple } from '@/api/couples';
import { uploadAvatar } from '@/api/storage';
import type { Profile } from '@/types/database';
import { paperCardSx, pinRedSx, pinGreenSx, pinBlueSx, ctaButtonSx } from '@/styles/board';
import AvailabilityCard from '@/components/AvailabilityCard';

const editSchema = z.object({
  coupleName: z.string().max(100, 'Name is too long').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().or(z.literal('')),
  hostingPreference: z.enum(['host', 'visit', 'both']),
});

type EditFormData = z.infer<typeof editSchema>;

const labelSx = {
  fontFamily: 'var(--font-condensed), sans-serif',
  fontWeight: 700,
  fontSize: '0.8rem',
  color: 'var(--ink-blue-light)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  mb: 0.5,
} as const;

const valueSx = {
  fontFamily: 'var(--font-handwriting), cursive',
  fontSize: '1.35rem',
  color: 'var(--ink-blue)',
  lineHeight: 1.5,
} as const;

export default function ProfilePage() {
  const router = useRouter();
  const { user, couple, signOut, refreshCouple } = useAppContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
  });

  useEffect(() => {
    if (!user) return;
    getProfile(user.id).then(({ profile: p }) => {
      if (!p) { router.replace('/profile/create'); return; }
      setProfile(p);
      setLoading(false);
    });
  }, [user, router]);

  useEffect(() => {
    if (!couple?.partner_2_id) return;
    getProfile(couple.partner_2_id).then(({ profile: p }) => setPartnerProfile(p));
  }, [couple]);

  useEffect(() => {
    if (couple && editing) {
      reset({
        coupleName: couple.couple_name ?? '',
        bio: couple.bio ?? '',
        hostingPreference: couple.hosting_preference,
      });
    }
  }, [couple, editing, reset]);

  if (loading || !profile) return null;

  const handleSignOut = async () => { await signOut(); router.push('/'); };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoError(null);
    setPhotoUploading(true);
    const uploadResult = await uploadAvatar(user.id, file);
    if (uploadResult.error) { setPhotoError(uploadResult.error); setPhotoUploading(false); return; }
    if (uploadResult.url) {
      const { profile: updated } = await updateProfile(user.id, { avatar_url: uploadResult.url });
      if (updated) setProfile(updated);
    }
    setPhotoUploading(false);
  };

  const onSubmit = async (data: EditFormData) => {
    if (!couple) return;
    setSaveError(null);
    const result = await updateCouple(couple.id, {
      couple_name: data.coupleName || null,
      bio: data.bio || null,
      hosting_preference: data.hostingPreference,
    });
    if (result.error) { setSaveError(result.error); return; }
    await refreshCouple();
    setEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };


  return (
    <Box sx={{ maxWidth: 520, mx: 'auto' }}>
      <Typography
        sx={{
          fontFamily: 'var(--font-marker), cursive',
          fontSize: 'clamp(2rem, 4.5vw, 2.9rem)',
          color: 'var(--ink-blue)',
          mb: 1,
        }}
      >
        {couple?.couple_name ?? 'Your Profile'}
      </Typography>
      <Typography
        sx={{
          fontFamily: 'var(--font-handwriting), cursive',
          fontSize: '1.45rem',
          color: 'var(--ink-blue-light)',
          mb: 3,
          lineHeight: 1.5,
        }}
      >
        Here&apos;s what other couples see about you.
      </Typography>

      {saveSuccess && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            bgcolor: 'rgba(91, 127, 94, 0.08)',
            color: 'var(--thumbtack-green)',
            fontFamily: 'var(--font-handwriting), cursive',
            fontSize: '1.15rem',
            '& .MuiAlert-icon': { color: 'var(--thumbtack-green)' },
          }}
        >
          Profile updated!
        </Alert>
      )}

      {/* ── Photo card ── */}
      <Card
        sx={{
          ...paperCardSx as object,
          transform: 'rotate(0.6deg)',
          position: 'relative',
          mb: 2.5,
          overflow: 'hidden',
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: 'rotate(0.6deg) translateY(-4px) scale(1.01)',
          },
        }}
      >
        <Box sx={pinBlueSx} />
        {profile.avatar_url ? (
          <Box
            component="img"
            src={profile.avatar_url}
            alt={profile.full_name}
            sx={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: 240,
              bgcolor: 'var(--paper-aged)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ ...valueSx, color: 'var(--ink-blue-light)', fontSize: '1.2rem' }}>
              No photo yet
            </Typography>
          </Box>
        )}
        <Box sx={{ p: '12px 20px', borderTop: '2px dashed var(--cork-dark)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            component="label"
            disabled={photoUploading}
            sx={{
              fontFamily: 'var(--font-condensed), sans-serif',
              fontWeight: 700,
              fontSize: '0.85rem',
              color: 'var(--ink-blue)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              minWidth: 0,
              p: '4px 8px',
              '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
            }}
          >
            {photoUploading ? 'Uploading...' : profile.avatar_url ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhotoChange} />
          </Button>
          {photoError && (
            <Typography sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1rem', color: 'var(--pushpin-red)' }}>
              {photoError}
            </Typography>
          )}
        </Box>
      </Card>

      {/* ── Profile card ── */}
      <Card
        sx={{
          ...paperCardSx as object,
          transform: 'rotate(-0.8deg)',
          p: '32px 28px 24px',
          position: 'relative',
          mb: 3,
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: 'rotate(-0.8deg) translateY(-4px) scale(1.01)',
          },
        }}
      >
        <Box sx={pinRedSx} />

        {/* ── View mode ── */}
        {couple && !editing && (
          <>
            {/* People */}
            <Box sx={{ mb: 2.5, mt: 0.5 }}>
              <Typography sx={labelSx}>Who we are</Typography>
              <Typography sx={{ ...valueSx, fontSize: '1.5rem', fontFamily: 'var(--font-marker), cursive', mb: 0.25 }}>
                {profile.full_name}, {profile.age}
              </Typography>
              {partnerProfile ? (
                <Typography sx={valueSx}>
                  &amp; {partnerProfile.full_name}, {partnerProfile.age}
                </Typography>
              ) : (
                <Chip
                  label="Partner hasn't joined yet"
                  size="small"
                  sx={{ bgcolor: 'var(--index-yellow)', color: 'var(--ink-blue)', fontFamily: 'var(--font-condensed), sans-serif', fontWeight: 600, mt: 0.5 }}
                />
              )}
            </Box>

            {/* Bio */}
            {couple.bio && (
              <Box sx={{ mb: 2.5, pt: 2, borderTop: '1px dashed var(--cork-dark)' }}>
                <Typography sx={labelSx}>About us</Typography>
                <Typography sx={valueSx}>{couple.bio}</Typography>
              </Box>
            )}

            {/* Details row */}
            <Box sx={{ display: 'flex', gap: 4, mb: 2.5, pt: couple.bio ? 0 : 2, borderTop: couple.bio ? 'none' : '1px dashed var(--cork-dark)' }}>
              <Box>
                <Typography sx={labelSx}>Neighborhood</Typography>
                <Typography sx={valueSx}>{couple.zip_code}</Typography>
              </Box>
              <Box>
                <Typography sx={labelSx}>Hosting preference</Typography>
                <Typography sx={valueSx}>
                  {couple.hosting_preference === 'host'
                    ? 'We like to host'
                    : couple.hosting_preference === 'visit'
                    ? 'We prefer to visit'
                    : 'Happy to host or visit'}
                </Typography>
              </Box>
            </Box>

            {/* Edit action in dashed footer */}
            <Box sx={{ borderTop: '2px dashed var(--cork-dark)', pt: 2, textAlign: 'center' }}>
              <Button
                onClick={() => setEditing(true)}
                sx={{
                  fontFamily: 'var(--font-condensed), sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--ink-blue)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
                }}
              >
                Edit couple info
              </Button>
            </Box>
          </>
        )}

        {/* ── Edit mode ── */}
        {couple && editing && (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 0.5 }}>
            {saveError && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  bgcolor: 'rgba(204, 68, 51, 0.08)',
                  color: 'var(--pushpin-red)',
                  fontFamily: 'var(--font-handwriting), cursive',
                  '& .MuiAlert-icon': { color: 'var(--pushpin-red)' },
                }}
              >
                {saveError}
              </Alert>
            )}
            <TextField
              label="Couple name"
              {...register('coupleName')}
              error={!!errors.coupleName}
              helperText={errors.coupleName?.message}
              fullWidth
              placeholder='e.g. "The Patels"'
              sx={{
                mb: 2.5,
                '& .MuiInputLabel-root': { fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.2rem' },
                '& .MuiInput-root': { fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.15rem' },
              }}
            />
            <TextField
              label="Bio"
              {...register('bio')}
              error={!!errors.bio}
              helperText={errors.bio?.message}
              fullWidth
              multiline
              rows={3}
              placeholder="A few words about what you enjoy or what you're looking for"
              sx={{
                mb: 2.5,
                '& .MuiInputLabel-root': { fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.2rem' },
                '& .MuiInput-root': { fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.15rem' },
              }}
            />
            <Controller
              name="hostingPreference"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.2rem' }}>
                    Hosting preference
                  </InputLabel>
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    label="Hosting preference"
                    sx={{ fontFamily: 'var(--font-handwriting), cursive', fontSize: '1.15rem' }}
                  >
                    <MenuItem value="host">We like to host</MenuItem>
                    <MenuItem value="visit">We prefer to visit</MenuItem>
                    <MenuItem value="both">Either works for us</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Box sx={{ display: 'flex', gap: 1.5, borderTop: '2px dashed var(--cork-dark)', pt: 2 }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                sx={{ ...ctaButtonSx as object, py: '10px', px: '28px', fontSize: '0.95rem' }}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={() => { setEditing(false); setSaveError(null); }}
                sx={{
                  fontFamily: 'var(--font-condensed), sans-serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--ink-blue)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  '&:hover': { color: 'var(--pushpin-red)', bgcolor: 'transparent' },
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      {/* ── Availability ── */}
      {couple && <AvailabilityCard coupleId={couple.id} />}

      {/* ── Sign out ── */}
      <Card
        sx={{
          ...paperCardSx as object,
          transform: 'rotate(0.5deg)',
          p: '16px 24px',
          position: 'relative',
          '&:hover': {
            ...(paperCardSx as any)['&:hover'],
            transform: 'rotate(0.5deg) translateY(-4px) scale(1.01)',
          },
        }}
      >
        <Box sx={{ ...pinGreenSx as object }} />
        <Button
          fullWidth
          onClick={handleSignOut}
          sx={{
            ...ctaButtonSx as object,
            bgcolor: 'transparent',
            color: 'var(--ink-blue)',
            border: '2px solid var(--ink-blue)',
            width: '100%',
            mt: 1,
            '&:hover': {
              bgcolor: 'rgba(43, 69, 112, 0.06)',
              color: 'var(--pushpin-red)',
              borderColor: 'var(--pushpin-red)',
              transform: 'scale(1.03)',
            },
          }}
        >
          Sign out
        </Button>
      </Card>
    </Box>
  );
}
