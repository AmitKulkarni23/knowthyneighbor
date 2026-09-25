'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import FormHelperText from '@mui/material/FormHelperText';
import { createCouple } from '@/api/couples';
import { coupleSchema, type CoupleFormData } from '@/lib/validations';

export default function CreateCouplePage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CoupleFormData>({
    resolver: zodResolver(coupleSchema),
    defaultValues: {
      coupleName: '',
      bio: '',
      zipCode: '',
      hostingPreference: 'both',
      partnerName: '',
      partnerAge: undefined as unknown as number,
    },
  });

  const partnerName = watch('partnerName');

  const onSubmit = async (data: CoupleFormData) => {
    setServerError(null);

    const result = await createCouple({
      couple_name: data.coupleName || null,
      bio: data.bio || null,
      zip_code: data.zipCode,
      hosting_preference: data.hostingPreference,
      partner_name: data.partnerName,
      partner_age: data.partnerAge,
    });

    if (result.error) {
      setServerError(result.error);
      return;
    }

    if (result.couple) {
      const link = `${window.location.origin}/join/${result.couple.id}/${result.couple.invite_code}`;
      setInviteLink(link);
    }
  };

  if (inviteLink) {
    return (
      <Box sx={{ maxWidth: 500, mx: 'auto', textAlign: 'center' }}>
        <Typography variant="h1" sx={{ mb: 1 }}>
          You're all set!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Share this link with {partnerName} so they can join your couple profile.
        </Typography>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <TextField
              value={inviteLink}
              fullWidth
              slotProps={{ input: { readOnly: true } }}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              sx={{ mb: 2 }}
            >
              Copy invite link
            </Button>
            <Button
              variant="text"
              fullWidth
              onClick={() => router.push('/discover')}
            >
              Go to discovery
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h1" sx={{ mb: 1 }}>
        Set up your couple profile
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        This is what other couples will see when they browse. Your partner will get an invite link to join.
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
              label="Couple name"
              {...register('coupleName')}
              error={!!errors.coupleName}
              helperText={errors.coupleName?.message}
              fullWidth
              placeholder='e.g. "The Patels"'
              sx={{ mb: 2 }}
            />
            <TextField
              label="Bio"
              {...register('bio')}
              error={!!errors.bio}
              helperText={errors.bio?.message}
              fullWidth
              multiline
              rows={3}
              placeholder="A few words about what you enjoy, what you cook, or what you're looking for"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Zip code"
              {...register('zipCode')}
              error={!!errors.zipCode}
              helperText={errors.zipCode?.message}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 10 } }}
              sx={{ mb: 2 }}
            />
            <Controller
              name="hostingPreference"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 3 }} error={!!errors.hostingPreference}>
                  <InputLabel>Hosting preference</InputLabel>
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    label="Hosting preference"
                  >
                    <MenuItem value="host">We like to host</MenuItem>
                    <MenuItem value="visit">We prefer to visit</MenuItem>
                    <MenuItem value="both">Either works for us</MenuItem>
                  </Select>
                  {errors.hostingPreference && (
                    <FormHelperText>{errors.hostingPreference.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <Divider sx={{ mb: 2 }} />
            <Typography variant="h3" sx={{ mb: 2 }}>
              Your partner's info
            </Typography>

            <TextField
              label="Partner's full name"
              {...register('partnerName')}
              error={!!errors.partnerName}
              helperText={errors.partnerName?.message}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Partner's age"
              type="number"
              {...register('partnerAge', { valueAsNumber: true })}
              error={!!errors.partnerAge}
              helperText={errors.partnerAge?.message}
              fullWidth
              slotProps={{ htmlInput: { min: 18, max: 120 } }}
              sx={{ mb: 2 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create couple profile'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
