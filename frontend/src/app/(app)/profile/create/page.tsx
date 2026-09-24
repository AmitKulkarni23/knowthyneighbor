'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import { createProfile } from '@/api/profiles';
import { uploadAvatar, getAvatarUrl } from '@/api/storage';
import { updateProfile } from '@/api/profiles';
import useAuth from '@/hooks/useAuth';

export default function CreateProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [hasKids, setHasKids] = useState(false);
  const [numKids, setNumKids] = useState('0');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setLoading(true);

    const result = await createProfile({
      full_name: fullName,
      age: parseInt(age, 10),
      has_kids: hasKids,
      num_kids: hasKids ? parseInt(numKids, 10) : 0,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Upload avatar if selected
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              fullWidth
              required
              inputProps={{ min: 18, max: 120 }}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={hasKids}
                  onChange={(e) => setHasKids(e.target.checked)}
                />
              }
              label="I have kids"
              sx={{ mb: 1, display: 'block' }}
            />
            {hasKids && (
              <TextField
                label="Number of kids"
                type="number"
                value={numKids}
                onChange={(e) => setNumKids(e.target.value)}
                fullWidth
                inputProps={{ min: 1, max: 20 }}
                sx={{ mb: 2 }}
              />
            )}
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
              disabled={loading || !fullName || !age}
            >
              {loading ? 'Creating...' : 'Continue'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
