'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  DialogProps,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface AppModalProps extends Omit<DialogProps, 'title'> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onClose: () => void;
}

export function AppModal({
  title,
  subtitle,
  actions,
  onClose,
  children,
  ...props
}: AppModalProps) {
  return (
    <Dialog
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      {...props}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          pb: subtitle ? 0.5 : 1,
          pr: 1,
        }}
      >
        <div>
          <Typography variant="h6" fontWeight={600} component="span" display="block">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" mt={0.25}>
              {subtitle}
            </Typography>
          )}
        </div>
        <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 3 }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
