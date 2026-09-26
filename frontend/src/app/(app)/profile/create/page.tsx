'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { createProfile } from '@/api/profiles';
import { uploadAvatar, getAvatarUrl } from '@/api/storage';
import { updateProfile } from '@/api/profiles';
import { useAppContext } from '@/components/AppProvider';
import { profileSchema, type ProfileFormData } from '@/lib/validations';

export default function CreateProfilePage() {
  const router = useRouter();
  const { user } = useAppContext();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      age: undefined as unknown as number,
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setServerError(null);

    const result = await createProfile({
      full_name: data.fullName,
      age: data.age,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    if (avatarFile && result.profile) {
      const uploadResult = await uploadAvatar(user.id, avatarFile);
      if (uploadResult.url) {
        await updateProfile(user.id, { avatar_url: uploadResult.url });
      }
    }

    router.push('/couple/create');
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Create your profile
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Tell us a little about yourself. This is just the basics.
      </Typography>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              label="Full name"
              {...register('fullName')}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Age"
              type="number"
              {...register('age', { valueAsNumber: true })}
              error={!!errors.age}
              helperText={errors.age?.message}
              fullWidth
              slotProps={{ htmlInput: { min: 18, max: 120 } }}
              sx={{ mb: 2 }}
            />
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mb: 3, justifyContent: 'flex-start', textTransform: 'none' }}
            >
              {avatarFile ? avatarFile.name : 'Upload a profile photo (optional)'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Continue'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
