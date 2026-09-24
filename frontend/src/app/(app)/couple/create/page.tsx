'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import { createCouple } from '@/api/couples';
import type { HostingPreference } from '@/types/database';

export default function CreateCouplePage() {
  const router = useRouter();
  const [coupleName, setCoupleName] = useState('');
  const [bio, setBio] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [hostingPreference, setHostingPreference] = useState<HostingPreference>('both');
  const [partnerName, setPartnerName] = useState('');
  const [partnerAge, setPartnerAge] = useState('');
  const [partnerHasKids, setPartnerHasKids] = useState(false);
  const [partnerNumKids, setPartnerNumKids] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createCouple({
      couple_name: coupleName || null,
      bio: bio || null,
      zip_code: zipCode,
      hosting_preference: hostingPreference,
      partner_name: partnerName,
      partner_age: parseInt(partnerAge, 10),
      partner_has_kids: partnerHasKids,
      partner_num_kids: partnerHasKids ? parseInt(partnerNumKids, 10) : 0,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.couple) {
      const link = `${window.location.origin}/join/${result.couple.id}/${result.couple.invite_code}`;
      setInviteLink(link);
    }

    setLoading(false);
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Couple name"
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              fullWidth
              placeholder='e.g. "The Patels"'
              sx={{ mb: 2 }}
            />
            <TextField
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="A few words about what you enjoy, what you cook, or what you're looking for"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Zip code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: 10 }}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Hosting preference</InputLabel>
              <Select
                value={hostingPreference}
                onChange={(e) => setHostingPreference(e.target.value as HostingPreference)}
                label="Hosting preference"
              >
                <MenuItem value="host">We like to host</MenuItem>
                <MenuItem value="visit">We prefer to visit</MenuItem>
                <MenuItem value="both">Either works for us</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="h3" sx={{ mb: 2 }}>
              Your partner's info
            </Typography>

            <TextField
              label="Partner's full name"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="Partner's age"
              type="number"
              value={partnerAge}
              onChange={(e) => setPartnerAge(e.target.value)}
              fullWidth
              required
              inputProps={{ min: 18, max: 120 }}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={partnerHasKids}
                  onChange={(e) => setPartnerHasKids(e.target.checked)}
                />
              }
              label="Partner has kids"
              sx={{ mb: 1, display: 'block' }}
            />
            {partnerHasKids && (
              <TextField
                label="Number of kids"
                type="number"
                value={partnerNumKids}
                onChange={(e) => setPartnerNumKids(e.target.value)}
                fullWidth
                inputProps={{ min: 1, max: 20 }}
                sx={{ mb: 2 }}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !zipCode || !partnerName || !partnerAge}
            >
              {loading ? 'Creating...' : 'Create couple profile'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
