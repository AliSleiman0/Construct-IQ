import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CuidHydratedDocument } from '../../../database/mongoose/base/types';
import { softDeletePlugin } from '../../../database/mongoose/plugins/soft-delete.plugin';
import { UserStatus } from '../../../common/enums';

export type UserDocument = CuidHydratedDocument<User>;

@Schema({ _id: false })
export class UserLocalization {
  @Prop({ type: String, enum: ['en', 'fr', 'es', 'ar'], default: 'en' })
  language: string;

  // `'auto'` defers to the browser-resolved IANA zone at render time.
  @Prop({ type: String, default: 'auto', maxlength: 64 })
  timezone: string;

  @Prop({
    type: String,
    enum: ['MMM D, YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    default: 'MMM D, YYYY',
  })
  dateFormat: string;

  @Prop({ type: String, enum: ['12h', '24h'], default: '12h' })
  timeFormat: string;

  @Prop({
    type: String,
    enum: ['sunday', 'monday', 'saturday'],
    default: 'sunday',
  })
  firstDayOfWeek: string;

  @Prop({ type: String, enum: ['imperial', 'metric'], default: 'imperial' })
  measurement: string;
}
export const UserLocalizationSchema =
  SchemaFactory.createForClass(UserLocalization);

@Schema({ _id: false })
export class UserNotificationPreferences {
  // Cadence for the periodic activity digest. Independent of org-level
  // notification policy — every user picks their own.
  @Prop({ type: String, enum: ['daily', 'weekly', 'never'], default: 'weekly' })
  digest: string;

  // Per-event opt-out toggles. `true` = "I want this email". Actual send
  // requires both the org-level event to be enabled AND this flag to be
  // true. Security alerts are intentionally absent and always deliver.
  @Prop({ type: Boolean, default: true })
  newProject: boolean;

  @Prop({ type: Boolean, default: true })
  invoiceDue: boolean;

  @Prop({ type: Boolean, default: true })
  invoicePaid: boolean;

  @Prop({ type: Boolean, default: true })
  ticketUpdate: boolean;

  @Prop({ type: Boolean, default: false })
  productNews: boolean;
}
export const UserNotificationPreferencesSchema =
  SchemaFactory.createForClass(UserNotificationPreferences);

@Schema({ collection: 'users', timestamps: true })
export class User {
  _id: string;

  // Nullable: SUPER_ADMIN has no org; external (Supplier/Subcontractor) users
  // belong to a Supplier rather than an Organization. Authoritative org-scope
  // logic lives in services and the OrgContextInterceptor.
  @Prop({ type: String, ref: 'Organization', default: null, index: true })
  organizationId: string | null;

  @Prop({ type: String, required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, required: true, maxlength: 64 })
  firstName: string;

  @Prop({ type: String, required: true, maxlength: 64 })
  lastName: string;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  @Prop({ type: Boolean, default: false })
  isExternal: boolean;

  @Prop({ type: String, ref: 'Supplier', default: null })
  supplierId: string | null;

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  @Prop({ type: String, default: null })
  refreshToken: string | null;

  // Replaces the old UserRole join collection. Populated against `Role`.
  @Prop({ type: [String], ref: 'Role', default: [] })
  roleIds: string[];

  // Per-user localization preferences. Defaults populate the subdoc on
  // first read for legacy documents — no migration required.
  @Prop({ type: UserLocalizationSchema, default: () => ({}) })
  localization: UserLocalization;

  // Per-user notification preferences. Same migration-free default pattern.
  @Prop({ type: UserNotificationPreferencesSchema, default: () => ({}) })
  notifications: UserNotificationPreferences;

  // softDeletePlugin adds `deletedAt: Date|null` and auto-filters reads.
  deletedAt: Date | null;

  // Timestamps from @Schema({ timestamps: true })
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.plugin(softDeletePlugin);

// Partial unique index on email scoped per-organization: matches the old
// Prisma intent of "uniqueness only among non-deleted rows" so soft-deleted
// users do not block re-registration of the same email.
UserSchema.index(
  { email: 1, organizationId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
