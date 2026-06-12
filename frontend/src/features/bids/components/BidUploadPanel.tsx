'use client';

import { useRef, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import { AppButton } from '@/components/ui/AppButton';
import { useUploadBids } from '../hooks/useBids';

const MAX_FILES = 10;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

interface BidUploadPanelProps {
  projectId: string;
  /** Notified after a successful upload so the parent can refresh / scroll / etc. */
  onUploaded?: () => void;
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function BidUploadPanel({ projectId, onUploaded }: BidUploadPanelProps) {
  const { enqueueSnackbar } = useSnackbar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tradePackage, setTradePackage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploadBids();

  const addFiles = (incoming: File[]) => {
    const rejected: string[] = [];
    const accepted = incoming.filter((f) => {
      if (!isPdf(f)) {
        rejected.push(`${f.name} (not a PDF)`);
        return false;
      }
      if (f.size > MAX_FILE_BYTES) {
        rejected.push(`${f.name} (exceeds 25 MB)`);
        return false;
      }
      return true;
    });
    if (rejected.length > 0) {
      enqueueSnackbar(`Rejected: ${rejected.join(', ')}`, { variant: 'warning' });
    }
    setFiles((existing) => {
      const merged = [...existing];
      for (const f of accepted) {
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      return merged.slice(0, MAX_FILES);
    });
  };

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    addFiles(Array.from(list));
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (!e.dataTransfer.files) return;
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (name: string, size: number) => {
    setFiles((existing) => existing.filter((f) => !(f.name === name && f.size === size)));
  };

  const reset = () => {
    setFiles([]);
    setTradePackage('');
  };

  const submit = async () => {
    if (!tradePackage.trim()) {
      enqueueSnackbar('Enter a trade package name first.', { variant: 'warning' });
      return;
    }
    if (files.length === 0) {
      enqueueSnackbar('Add at least one PDF bid.', { variant: 'warning' });
      return;
    }
    try {
      const created = await upload.mutateAsync({
        projectId,
        tradePackage: tradePackage.trim(),
        files,
      });
      const failed = created.filter((b) => b.extractionStatus === 'FAILED').length;
      const ok = created.length - failed;
      if (failed > 0) {
        enqueueSnackbar(
          `${ok} bid${ok === 1 ? '' : 's'} analyzed, ${failed} failed.`,
          { variant: 'warning' },
        );
      } else {
        enqueueSnackbar(`${ok} bid${ok === 1 ? '' : 's'} analyzed.`, {
          variant: 'success',
        });
      }
      reset();
      onUploaded?.();
    } catch (e: any) {
      const status = e?.response?.status;
      const message =
        status === 503
          ? 'File storage is not configured.'
          : status === 403
            ? e?.response?.data?.message ??
              'Your AI plan does not include bid analysis.'
            : e?.response?.data?.message ?? 'Upload failed.';
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
              Upload subcontractor bids
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drop up to {MAX_FILES} bid PDFs for a single trade package. AI will
              extract price, terms, warranties, and red flags from each.
            </Typography>
          </Box>

          <TextField
            label="Trade package"
            placeholder="e.g. Electrical - Block A"
            value={tradePackage}
            onChange={(e) => setTradePackage(e.target.value)}
            fullWidth
            size="small"
            disabled={upload.isPending}
            inputProps={{ maxLength: 200 }}
          />

          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: dragOver ? 'primary.50' : 'background.default',
              transition: 'background-color 120ms, border-color 120ms',
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Drag &amp; drop PDF bids here, or
            </Typography>
            <AppButton
              variant="outlined"
              component="label"
              size="small"
              disabled={upload.isPending || files.length >= MAX_FILES}
            >
              Browse files
              <input
                ref={inputRef}
                hidden
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={handlePick}
              />
            </AppButton>
          </Box>

          {files.length > 0 && (
            <Stack spacing={1}>
              {files.map((file) => (
                <Stack
                  key={`${file.name}-${file.size}`}
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ p: 1, borderRadius: 1, bgcolor: 'background.default' }}
                >
                  <PictureAsPdfIcon color="error" fontSize="small" />
                  <Box flexGrow={1} minWidth={0}>
                    <Typography variant="body2" noWrap title={file.name}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => removeFile(file.name, file.size)}
                    disabled={upload.isPending}
                    aria-label="remove file"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Box display="flex" justifyContent="flex-end">
                <Chip
                  size="small"
                  label={`${files.length} / ${MAX_FILES} file${files.length === 1 ? '' : 's'}`}
                />
              </Box>
            </Stack>
          )}

          {upload.isPending && (
            <Alert severity="info">
              Extracting bid data — this typically takes 10–30 seconds per file.
            </Alert>
          )}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <AppButton
              variant="text"
              onClick={reset}
              disabled={upload.isPending || (files.length === 0 && !tradePackage)}
            >
              Clear
            </AppButton>
            <AppButton
              variant="contained"
              onClick={submit}
              loading={upload.isPending}
              disabled={files.length === 0 || !tradePackage.trim()}
            >
              Analyze {files.length > 0 ? `${files.length} bid${files.length === 1 ? '' : 's'}` : 'bids'}
            </AppButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
