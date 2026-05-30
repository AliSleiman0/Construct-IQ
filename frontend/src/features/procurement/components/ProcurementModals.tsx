'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Stack, Alert, Box, Typography, IconButton, TextField, MenuItem, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { AppModal } from '@/components/ui/AppModal';
import { AppButton } from '@/components/ui/AppButton';
import { FormTextField } from '@/components/form/FormTextField';
import { FormSelectField } from '@/components/form/FormSelectField';
import type {
  Supplier, PurchaseOrder, Delivery, PurchaseOrderStatus, DeliveryStatus,
  CreateSupplierPayload, CreatePurchaseOrderPayload, CreateMaterialRequestPayload,
} from '@/types/procurement.types';
import type { UpdatePurchaseOrderPayload } from '../hooks/usePurchaseOrders';

const num = z.coerce.number({ invalid_type_error: 'Number' }).min(0, '≥ 0');

// ── Supplier ─────────────────────────────────────────────────────────────────
const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactName: z.string().optional(),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});
export type SupplierFormValues = z.infer<typeof supplierSchema>;

export function SupplierModal({
  open, supplier, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  supplier?: Supplier | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: CreateSupplierPayload) => void;
}) {
  const { control, handleSubmit, reset } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', contactName: '', email: '', phone: '', address: '', taxId: '', website: '', notes: '' },
  });
  useEffect(() => {
    if (open) reset({
      name: supplier?.name ?? '', contactName: supplier?.contactName ?? '', email: supplier?.email ?? '',
      phone: supplier?.phone ?? '', address: supplier?.address ?? '', taxId: supplier?.taxId ?? '',
      website: supplier?.website ?? '', notes: supplier?.notes ?? '',
    });
  }, [open, supplier, reset]);

  const submit = (v: SupplierFormValues) => {
    const clean: CreateSupplierPayload = { name: v.name };
    for (const k of ['contactName', 'email', 'phone', 'address', 'taxId', 'website', 'notes'] as const) {
      if (v[k]) (clean as any)[k] = v[k];
    }
    onSubmit(clean);
  };

  return (
    <AppModal open={open} onClose={onClose} title={supplier ? 'Edit supplier' : 'Add supplier'}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(submit)}>{supplier ? 'Save' : 'Add supplier'}</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="name" control={control} label="Supplier name" fullWidth />
        <FormTextField name="contactName" control={control} label="Contact name (optional)" fullWidth />
        <FormTextField name="email" control={control} label="Email (optional)" fullWidth />
        <FormTextField name="phone" control={control} label="Phone (optional)" fullWidth />
        <FormTextField name="address" control={control} label="Address (optional)" fullWidth />
        <FormTextField name="notes" control={control} label="Notes (optional)" fullWidth multiline minRows={2} />
      </Stack>
    </AppModal>
  );
}

// ── Purchase Order ───────────────────────────────────────────────────────────
const poSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  supplierId: z.string().min(1, 'Select a supplier'),
  poNumber: z.string().min(1, 'PO number is required'),
  orderDate: z.string().min(1, 'Order date is required'),
  status: z.enum(['DRAFT', 'SUBMITTED']),
  currency: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description'),
    quantity: num,
    unitPrice: num,
    unit: z.string().optional(),
  })).optional(),
});
export type POFormValues = z.infer<typeof poSchema>;

export function CreatePOModal({
  open, projects, suppliers, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  projects: { id: string; name: string }[];
  suppliers: Supplier[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: CreatePurchaseOrderPayload) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const { control, handleSubmit, reset, watch } = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: { projectId: '', supplierId: '', poNumber: '', orderDate: today, status: 'DRAFT', currency: 'USD', expectedDeliveryDate: '', notes: '', items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  useEffect(() => { if (open) reset({ projectId: '', supplierId: '', poNumber: '', orderDate: today, status: 'DRAFT', currency: 'USD', expectedDeliveryDate: '', notes: '', items: [] }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = watch('items') ?? [];
  const total = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const submit = (v: POFormValues) => {
    const builtItems = (v.items ?? []).map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.quantity) * Number(it.unitPrice),
      unit: it.unit || undefined,
    }));
    onSubmit({
      projectId: v.projectId,
      supplierId: v.supplierId,
      poNumber: v.poNumber,
      orderDate: v.orderDate,
      status: v.status as PurchaseOrderStatus,
      currency: v.currency || 'USD',
      expectedDeliveryDate: v.expectedDeliveryDate || undefined,
      notes: v.notes || undefined,
      totalAmount: total,
      items: builtItems,
    });
  };

  return (
    <AppModal open={open} onClose={onClose} title="Create purchase order"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(submit)}>Create PO</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormSelectField name="projectId" control={control} label="Project" options={projects.map((p) => ({ label: p.name, value: p.id }))} />
        <FormSelectField name="supplierId" control={control} label="Supplier" options={suppliers.map((s) => ({ label: s.name, value: s.id }))} />
        <FormTextField name="poNumber" control={control} label="PO number" fullWidth placeholder="e.g. PO-1001" />
        <Stack direction="row" spacing={2}>
          <FormTextField name="orderDate" control={control} label="Order date" type="date" fullWidth InputLabelProps={{ shrink: true }} />
          <FormSelectField name="status" control={control} label="Status" options={[{ label: 'Draft', value: 'DRAFT' }, { label: 'Submitted', value: 'SUBMITTED' }]} />
        </Stack>
        <FormTextField name="expectedDeliveryDate" control={control} label="Expected delivery (optional)" type="date" fullWidth InputLabelProps={{ shrink: true }} />

        <Divider />
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={600}>Line items</Typography>
          <AppButton size="small" startIcon={<AddIcon />} onClick={() => append({ description: '', quantity: 1, unitPrice: 0, unit: '' })}>
            Add item
          </AppButton>
        </Box>
        {fields.map((f, i) => (
          <Stack key={f.id} direction="row" spacing={1} alignItems="flex-start">
            <Controller name={`items.${i}.description`} control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Description" size="small" sx={{ flex: 2 }} error={!!fieldState.error} />
              )} />
            <Controller name={`items.${i}.quantity`} control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Qty" type="number" size="small" sx={{ flex: 1 }} error={!!fieldState.error} />
              )} />
            <Controller name={`items.${i}.unitPrice`} control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Unit price" type="number" size="small" sx={{ flex: 1 }} error={!!fieldState.error} />
              )} />
            <IconButton aria-label={`Remove item ${i + 1}`} onClick={() => remove(i)} sx={{ mt: 0.5 }}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        ))}
        <Typography variant="body2" color="text.secondary" align="right">
          Total: {total.toLocaleString()}
        </Typography>
      </Stack>
    </AppModal>
  );
}

// ── Edit Purchase Order ──────────────────────────────────────────────────────
const PO_STATUSES: PurchaseOrderStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DELIVERED', 'CANCELLED'];

const editPoSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'DELIVERED', 'CANCELLED']),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description'),
    quantity: num,
    unitPrice: num,
    unit: z.string().optional(),
  })).optional(),
});
type EditPOFormValues = z.infer<typeof editPoSchema>;

export function EditPOModal({
  open, po, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  po: PurchaseOrder | null;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: UpdatePurchaseOrderPayload) => void;
}) {
  const { control, handleSubmit, reset, watch } = useForm<EditPOFormValues>({
    resolver: zodResolver(editPoSchema),
    defaultValues: { status: 'DRAFT', expectedDeliveryDate: '', notes: '', items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (open && po) reset({
      status: po.status,
      expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.slice(0, 10) : '',
      notes: po.notes ?? '',
      items: (po.items ?? []).map((it) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unit: it.unit ?? '',
      })),
    });
  }, [open, po, reset]);

  const items = watch('items') ?? [];
  const total = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

  const submit = (v: EditPOFormValues) => {
    const builtItems = (v.items ?? []).map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.quantity) * Number(it.unitPrice),
      unit: it.unit || undefined,
    }));
    onSubmit({
      status: v.status,
      expectedDeliveryDate: v.expectedDeliveryDate || undefined,
      notes: v.notes || undefined,
      items: builtItems,
      totalAmount: total || undefined,
    });
  };

  return (
    <AppModal open={open} onClose={onClose} title={`Edit PO ${po?.poNumber ?? ''}`}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(submit)}>Save changes</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormSelectField
          name="status" control={control} label="Status"
          options={PO_STATUSES.map((s) => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s }))}
        />
        <FormTextField name="expectedDeliveryDate" control={control} label="Expected delivery (optional)" type="date" fullWidth InputLabelProps={{ shrink: true }} />
        <FormTextField name="notes" control={control} label="Notes (optional)" fullWidth multiline minRows={2} />

        <Divider />
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={600}>Line items</Typography>
          <AppButton size="small" startIcon={<AddIcon />} onClick={() => append({ description: '', quantity: 1, unitPrice: 0, unit: '' })}>
            Add item
          </AppButton>
        </Box>
        {fields.map((f, i) => (
          <Stack key={f.id} direction="row" spacing={1} alignItems="flex-start">
            <Controller name={`items.${i}.description`} control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Description" size="small" sx={{ flex: 2 }} error={!!fieldState.error} />
              )} />
            <Controller name={`items.${i}.quantity`} control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Qty" type="number" size="small" sx={{ flex: 1 }} error={!!fieldState.error} />
              )} />
            <Controller name={`items.${i}.unitPrice`} control={control}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Unit price" type="number" size="small" sx={{ flex: 1 }} error={!!fieldState.error} />
              )} />
            <IconButton aria-label={`Remove item ${i + 1}`} onClick={() => remove(i)} sx={{ mt: 0.5 }}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        ))}
        <Typography variant="body2" color="text.secondary" align="right">
          Total: {total.toLocaleString()}
        </Typography>
      </Stack>
    </AppModal>
  );
}

// ── Material Request ──────────────────────────────────────────────────────────
const mrSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  estimatedCost: z.coerce.number({ invalid_type_error: 'Number' }).min(0).optional().or(z.literal('')),
  currency: z.string().optional(),
  neededByDate: z.string().optional(),
});
type MRFormValues = z.infer<typeof mrSchema>;

export function CreateMaterialRequestModal({
  open, projects, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  projects: { id: string; name: string }[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: CreateMaterialRequestPayload) => void;
}) {
  const { control, handleSubmit, reset } = useForm<MRFormValues>({
    resolver: zodResolver(mrSchema),
    defaultValues: { projectId: '', title: '', description: '', category: '', estimatedCost: '', currency: 'USD', neededByDate: '' },
  });
  useEffect(() => { if (open) reset({ projectId: '', title: '', description: '', category: '', estimatedCost: '', currency: 'USD', neededByDate: '' }); }, [open, reset]);

  const submit = (v: MRFormValues) => {
    const payload: CreateMaterialRequestPayload = {
      projectId: v.projectId,
      title: v.title,
    };
    if (v.description) payload.description = v.description;
    if (v.category) payload.category = v.category;
    if (v.estimatedCost !== '' && v.estimatedCost != null) payload.estimatedCost = Number(v.estimatedCost);
    if (v.currency) payload.currency = v.currency;
    if (v.neededByDate) payload.neededByDate = v.neededByDate;
    onSubmit(payload);
  };

  return (
    <AppModal open={open} onClose={onClose} title="New material request"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(submit)}>Submit request</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormSelectField name="projectId" control={control} label="Project" options={projects.map((p) => ({ label: p.name, value: p.id }))} />
        <FormTextField name="title" control={control} label="Title" fullWidth />
        <FormTextField name="description" control={control} label="Description (optional)" fullWidth multiline minRows={2} />
        <Stack direction="row" spacing={2}>
          <FormTextField name="category" control={control} label="Category (optional)" fullWidth />
          <FormTextField name="estimatedCost" control={control} label="Est. cost" type="number" fullWidth />
        </Stack>
        <FormTextField name="neededByDate" control={control} label="Needed by (optional)" type="date" fullWidth InputLabelProps={{ shrink: true }} />
      </Stack>
    </AppModal>
  );
}

// ── Delivery ─────────────────────────────────────────────────────────────────
const DELIVERY_STATUSES: DeliveryStatus[] = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'DELAYED', 'CANCELLED'];
const deliverySchema = z.object({
  purchaseOrderId: z.string().min(1, 'Select a purchase order'),
  deliveryDate: z.string().optional(),
  status: z.string(),
  notes: z.string().optional(),
});
export type DeliveryFormValues = z.infer<typeof deliverySchema>;

export function DeliveryModal({
  open, delivery, purchaseOrders, isLoading, error, onClose, onSubmit,
}: {
  open: boolean;
  delivery?: Delivery | null;
  purchaseOrders: PurchaseOrder[];
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: DeliveryFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: { purchaseOrderId: '', deliveryDate: '', status: 'PENDING', notes: '' },
  });
  useEffect(() => {
    if (open) reset({
      purchaseOrderId: delivery?.purchaseOrderId ?? '',
      deliveryDate: delivery?.deliveryDate ? delivery.deliveryDate.slice(0, 10) : '',
      status: delivery?.status ?? 'PENDING',
      notes: delivery?.notes ?? '',
    });
  }, [open, delivery, reset]);

  return (
    <AppModal open={open} onClose={onClose} title={delivery ? 'Update delivery' : 'Record delivery'}
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" p={2} pt={0}>
          <AppButton variant="outlined" onClick={onClose} disabled={isLoading}>Cancel</AppButton>
          <AppButton variant="contained" loading={isLoading} onClick={handleSubmit(onSubmit)}>{delivery ? 'Save' : 'Record'}</AppButton>
        </Stack>
      }
    >
      <Stack spacing={2.5} px={3} pb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormSelectField
          name="purchaseOrderId" control={control} label="Purchase order"
          disabled={!!delivery}
          options={purchaseOrders.map((p) => ({ label: p.poNumber, value: p.id }))}
        />
        <FormTextField name="deliveryDate" control={control} label="Delivery date (optional)" type="date" fullWidth InputLabelProps={{ shrink: true }} />
        <Controller name="status" control={control}
          render={({ field }) => (
            <TextField {...field} select label="Status" fullWidth>
              {DELIVERY_STATUSES.map((s) => <MenuItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')}</MenuItem>)}
            </TextField>
          )} />
        <FormTextField name="notes" control={control} label="Notes (optional)" fullWidth multiline minRows={2} />
      </Stack>
    </AppModal>
  );
}
