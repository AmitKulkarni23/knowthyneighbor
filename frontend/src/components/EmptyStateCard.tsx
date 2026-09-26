import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import { paperCardSx, pinRedSx, pinGreenSx, pinBlueSx } from '@/styles/board';

type PinColor = 'red' | 'green' | 'blue';

const pinMap: Record<PinColor, typeof pinRedSx> = {
  red: pinRedSx,
  green: pinGreenSx,
  blue: pinBlueSx,
};

interface EmptyStateCardProps {
  message: string;
  pin?: PinColor;
  rotation?: number;
  sx?: SxProps<Theme>;
}

export default function EmptyStateCard({
  message,
  pin = 'red',
  rotation = 0.6,
  sx: sxOverride,
}: EmptyStateCardProps) {
  return (
    <Card
      sx={{
        ...(paperCardSx as object),
        p: '32px 28px',
        position: 'relative',
        transform: `rotate(${rotation}deg)`,
        ...(sxOverride as object),
      }}
    >
      <Box sx={pinMap[pin]} />
      <Typography
        sx={{
          fontFamily: 'var(--font-handwriting), cursive',
          fontSize: '1.65rem',
          color: 'var(--ink-blue)',
          lineHeight: 1.6,
        }}
      >
        {message}
      </Typography>
    </Card>
  );
}
