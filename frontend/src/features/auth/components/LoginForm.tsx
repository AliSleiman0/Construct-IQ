'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { FormTextField } from '@/components/form/FormTextField';
import { AppButton } from '@/components/ui/AppButton';
import { useLogin } from '../hooks/useLogin';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login, isLoading } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values);
    } catch (error: any) {
      setFormError(
        error?.response?.data?.error?.message ?? 'Login failed. Please try again.',
      );
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 440 }}>
      {/* Brand header */}
      <Box textAlign="center" mb={4}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
            boxShadow: '0 8px 20px rgba(25,118,210,0.35)',
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>
            CQ
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight={700} color="white" mb={0.5}>
          ConstructIQ
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
          AI-powered construction management
        </Typography>
      </Box>

      {/* Login Card */}
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: 'none',
          overflow: 'visible',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={0.5}>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Enter your credentials to access your workspace
          </Typography>

          {formError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {formError}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            <FormTextField
              name="email"
              control={control}
              label="Email address"
              type="email"
              autoComplete="email"
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />

            <FormTextField
              name="password"
              control={control}
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <VisibilityOff sx={{ fontSize: 18 }} />
                      ) : (
                        <Visibility sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <AppButton
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={isLoading}
              sx={{ mt: 0.5, py: 1.25 }}
            >
              Sign in
            </AppButton>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center">
            <Typography variant="caption" color="text.disabled">
              Secure login powered by ConstructIQ
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
