import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Issue, IssueDocument } from './schemas/issue.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { AddIssueCommentDto } from './dto/add-issue-comment.dto';
import { BulkUpdateIssuesDto } from './dto/bulk-update-issues.dto';
import { IssueStatus, IssueSeverity } from '../../common/enums';
import { assertStatusTransition, TransitionMap } from '../../common/util/status-transition.util';

/** Issues open/in-progress older than this many days are "stale". */
const STALE_DAYS = 7;

// Issue lifecycle: OPEN → IN_PROGRESS → RESOLVED → CLOSED, with reopen paths.
// Blocks closing without first resolving (the "skip RESOLVED" bug).
const ISSUE_TRANSITIONS: TransitionMap<IssueStatus> = {
  [IssueStatus.OPEN]: [IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED],
  [IssueStatus.IN_PROGRESS]: [IssueStatus.RESOLVED, IssueStatus.OPEN],
  [IssueStatus.RESOLVED]: [IssueStatus.CLOSED, IssueStatus.IN_PROGRESS, IssueStatus.OPEN],
  [IssueStatus.CLOSED]: [IssueStatus.OPEN],
};

/**
 * Server-authoritative resolution timestamps for a target status:
 * resolving stamps resolvedAt; closing stamps closedAt; reopening clears both.
 * Client-supplied timestamps are never trusted.
 */
function issueTimestamps(status: IssueStatus): Partial<Record<'resolvedAt' | 'closedAt', Date | null>> {
  if (status === IssueStatus.RESOLVED) return { resolvedAt: new Date() };
  if (status === IssueStatus.CLOSED) return { closedAt: new Date() };
  return { resolvedAt: null, closedAt: null };
}

export interface IssueListParams {
  projectId?: string;
  inspectionId?: string;
  status?: IssueStatus;
  severity?: string;
  type?: string;
  /** A userId, or the literal 'NONE' for unassigned. */
  assignedToId?: string;
  search?: string;
  /** smart (default) | createdAt | severity | status | title */
  sort?: string;
  sortDir?: 'asc' | 'desc';
  limit?: number;
  skip?: number;
}

/**
 * Who is asking. When `orgWide` is false the caller only sees issues for the
 * projects they belong to (field roles); when true they see the whole org.
 */
export interface IssueViewer {
  userId: string;
  orgWide: boolean;
}

@Injectable()
export class IssuesService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  /** Project ids the user is a member of, within their org. */
  private async memberProjectIds(organizationId: string, userId: string): Promise<string[]> {
    const projects = await this.projectModel
      .find({ organizationId, 'members.userId': userId })
      .select('_id')
      .lean();
    return projects.map((p: any) => String(p._id));
  }

  private static readonly POPULATE = [
    { path: 'createdById', select: 'firstName lastName' },
    { path: 'assignedToId', select: 'firstName lastName' },
    { path: 'projectId', select: 'name' },
    { path: 'inspectionId', select: 'title' },
    { path: 'comments.authorId', select: 'firstName lastName' },
  ];

  private flattenUser(
    u: any,
  ): { id: string; firstName: string; lastName: string } | null {
    if (!u || typeof u !== 'object') return null;
    return { id: u._id, firstName: u.firstName, lastName: u.lastName };
  }

  /**
   * Flattens a populated, lean Issue doc into the shape the frontend expects:
   * keeps the raw id fields, and adds `createdBy` / `assignedTo` / `project`
   * objects plus `comments[].author`. Mongoose `populate` replaces the ref
   * field with the joined doc, so we read the id back off `_id`.
   */
  private mapIssue(doc: any): any {
    if (!doc) return doc;
    const createdBy = this.flattenUser(doc.createdById);
    const assignedTo = this.flattenUser(doc.assignedToId);
    const project =
      doc.projectId && typeof doc.projectId === 'object'
        ? { id: doc.projectId._id, name: doc.projectId.name }
        : null;
    const inspection =
      doc.inspectionId && typeof doc.inspectionId === 'object'
        ? { id: doc.inspectionId._id, title: doc.inspectionId.title }
        : null;

    return {
      ...doc,
      id: doc._id,
      createdById: createdBy?.id ?? (typeof doc.createdById === 'string' ? doc.createdById : null),
      assignedToId: assignedTo?.id ?? (typeof doc.assignedToId === 'string' ? doc.assignedToId : null),
      projectId: project?.id ?? (typeof doc.projectId === 'string' ? doc.projectId : doc.projectId),
      inspectionId: inspection?.id ?? (typeof doc.inspectionId === 'string' ? doc.inspectionId : null),
      createdBy,
      assignedTo,
      project,
      inspection,
      comments: (doc.comments ?? []).map((c: any) => ({
        ...c,
        id: c._id,
        authorId: this.flattenUser(c.authorId)?.id ?? (typeof c.authorId === 'string' ? c.authorId : null),
        author: this.flattenUser(c.authorId),
      })),
    };
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Constrain a filter to the caller's accessible projects. `restrictIds`:
   *   null  → org-wide (privileged caller), no extra constraint.
   *   []    → no accessible projects → match nothing.
   *   [...] → intersect with any explicit projectId filter.
   */
  private applyProjectScope(
    match: Record<string, unknown>,
    projectId: string | undefined,
    restrictIds: string[] | null,
  ): void {
    if (restrictIds === null) return;
    if (projectId) {
      // Honour the explicit project filter only if the caller is a member.
      match.projectId = restrictIds.includes(projectId) ? projectId : { $in: [] };
    } else {
      match.projectId = { $in: restrictIds };
    }
  }

  /** Build the Mongo $match for the org-scoped, filtered issue query. */
  private buildMatch(
    organizationId: string,
    isSuperAdmin: boolean,
    p: IssueListParams,
    restrictIds: string[] | null = null,
  ): Record<string, unknown> {
    const match: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (p.projectId) match.projectId = p.projectId;
    if (p.inspectionId) match.inspectionId = p.inspectionId;
    if (p.status) match.status = p.status;
    if (p.severity) match.severity = p.severity;
    if (p.type) match.type = p.type;
    if (p.assignedToId) match.assignedToId = p.assignedToId === 'NONE' ? null : p.assignedToId;
    if (p.search?.trim()) {
      const rx = new RegExp(this.escapeRegex(p.search.trim()), 'i');
      match.$or = [{ title: rx }, { location: rx }, { trade: rx }];
    }
    this.applyProjectScope(match, p.projectId, restrictIds);
    // aggregate() bypasses the soft-delete plugin's query hook — exclude deleted explicitly.
    match.deletedAt = null;
    return match;
  }

  /** Sort spec over computed ranks. Higher rank = more urgent (CRITICAL/OPEN). */
  private buildSort(sort: string | undefined, dir: 1 | -1): Record<string, 1 | -1> {
    switch (sort) {
      case 'createdAt':
        return { createdAt: dir };
      case 'title':
        return { title: dir };
      case 'severity':
        return { severityRank: dir, createdAt: 1 };
      case 'status':
        return { statusRank: dir, createdAt: 1 };
      case 'smart':
      default:
        // Open first, then most-severe, then oldest — the triage default.
        return { statusRank: -1, severityRank: -1, createdAt: 1 };
    }
  }

  /**
   * Paginated, filtered, smart-sorted issue list. Sorting needs computed
   * severity/status ranks → use an aggregation to get the ordered page of ids,
   * then re-fetch those ids with the existing populate + mapIssue (no duplicate
   * flatten logic). Returns the audit-style { items, total, limit, skip } shape.
   */
  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    params: IssueListParams = {},
    viewer?: IssueViewer,
  ): Promise<{ items: any[]; total: number; limit: number; skip: number }> {
    const limit = Math.min(params.limit ?? 25, 200);
    const skip = params.skip ?? 0;
    const dir: 1 | -1 = params.sortDir === 'asc' ? 1 : -1;

    const restrictIds =
      viewer && !viewer.orgWide && !isSuperAdmin
        ? await this.memberProjectIds(organizationId, viewer.userId)
        : null;
    if (restrictIds && restrictIds.length === 0) {
      return { items: [], total: 0, limit, skip };
    }
    const match = this.buildMatch(organizationId, isSuperAdmin, params, restrictIds);

    const idDocs = await this.issueModel.aggregate([
      { $match: match },
      {
        $addFields: {
          severityRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$severity', IssueSeverity.CRITICAL] }, then: 3 },
                { case: { $eq: ['$severity', IssueSeverity.HIGH] }, then: 2 },
                { case: { $eq: ['$severity', IssueSeverity.MEDIUM] }, then: 1 },
              ],
              default: 0,
            },
          },
          statusRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', IssueStatus.OPEN] }, then: 3 },
                { case: { $eq: ['$status', IssueStatus.IN_PROGRESS] }, then: 2 },
                { case: { $eq: ['$status', IssueStatus.RESOLVED] }, then: 1 },
              ],
              default: 0,
            },
          },
        },
      },
      { $sort: this.buildSort(params.sort, dir) },
      { $skip: skip },
      { $limit: limit },
      { $project: { _id: 1 } },
    ]);

    const total = await this.issueModel.countDocuments(match);
    const ids = idDocs.map((d: any) => d._id);
    if (ids.length === 0) return { items: [], total, limit, skip };

    const docs = await this.issueModel.find({ _id: { $in: ids } }).populate(IssuesService.POPULATE).lean();
    const byId = new Map(docs.map((d: any) => [String(d._id), d]));
    const items = ids
      .map((id: any) => byId.get(String(id)))
      .filter(Boolean)
      .map((d: any) => this.mapIssue(d));
    return { items, total, limit, skip };
  }

  /** Triage summary counts for the header chips / quick filters. */
  async getSummary(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    viewer?: IssueViewer,
  ): Promise<any> {
    const base: Record<string, unknown> = isSuperAdmin ? {} : { organizationId };
    if (projectId) base.projectId = projectId;

    if (viewer && !viewer.orgWide && !isSuperAdmin) {
      const restrictIds = await this.memberProjectIds(organizationId, viewer.userId);
      if (restrictIds.length === 0) {
        return { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, critical: 0, unassigned: 0, stale: 0 };
      }
      this.applyProjectScope(base, projectId, restrictIds);
    }

    const active = { $in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] };
    const staleBefore = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const c = (extra: Record<string, unknown>) => this.issueModel.countDocuments({ ...base, ...extra });

    const [total, open, inProgress, resolved, closed, critical, unassigned, stale] = await Promise.all([
      c({}),
      c({ status: IssueStatus.OPEN }),
      c({ status: IssueStatus.IN_PROGRESS }),
      c({ status: IssueStatus.RESOLVED }),
      c({ status: IssueStatus.CLOSED }),
      c({ severity: IssueSeverity.CRITICAL, status: active }),
      c({ assignedToId: null, status: active }),
      c({ status: active, createdAt: { $lt: staleBefore } }),
    ]);
    return { total, open, inProgress, resolved, closed, critical, unassigned, stale };
  }

  /** Bulk reassign and/or status-change. Org-scoped; stamps resolved/closed timestamps. */
  async bulkUpdate(organizationId: string, isSuperAdmin: boolean, dto: BulkUpdateIssuesDto): Promise<{ modified: number }> {
    if (!dto.ids?.length) return { modified: 0 };
    const filter = isSuperAdmin
      ? { _id: { $in: dto.ids } }
      : { _id: { $in: dto.ids }, organizationId };

    const set: Record<string, unknown> = {};
    if (dto.assignedToId !== undefined) set.assignedToId = dto.assignedToId || null;
    if (dto.status !== undefined) {
      // Validate the transition for every affected issue's current status before
      // applying. One illegal move (e.g. an OPEN issue → CLOSED) fails the whole batch.
      const targets = await this.issueModel.find(filter).select('status').lean();
      for (const t of targets) {
        assertStatusTransition('issue', (t as any).status, dto.status, ISSUE_TRANSITIONS);
      }
      set.status = dto.status;
      Object.assign(set, issueTimestamps(dto.status));
    }
    if (Object.keys(set).length === 0) return { modified: 0 };

    const res = await this.issueModel.updateMany(filter, { $set: set });
    return { modified: (res as any).modifiedCount ?? 0 };
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const issue = await this.issueModel
      .findOne(filter)
      .populate(IssuesService.POPULATE)
      .lean();
    if (!issue) throw new NotFoundException('Issue not found');
    return this.mapIssue(issue);
  }

  async create(
    organizationId: string,
    createdById: string,
    dto: CreateIssueDto,
  ) {
    return this.issueModel.create({
      organizationId,
      createdById,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      severity: dto.severity,
      status: IssueStatus.OPEN,
      location: dto.location ?? null,
      trade: dto.trade ?? null,
      assignedToId: dto.assignedToId ?? null,
      inspectionId: dto.inspectionId ?? null,
      comments: [],
    });
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateIssueDto,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const issue = await this.issueModel.findOne(filter);
    if (!issue) throw new NotFoundException('Issue not found');

    if (dto.title !== undefined) issue.title = dto.title;
    if (dto.description !== undefined) issue.description = dto.description ?? null;
    if (dto.type !== undefined) issue.type = dto.type;
    if (dto.severity !== undefined) issue.severity = dto.severity;
    if (dto.status !== undefined && dto.status !== issue.status) {
      // Enforce the lifecycle (no skipping RESOLVED) and derive timestamps
      // server-side. Any client-supplied resolvedAt is ignored.
      assertStatusTransition('issue', issue.status, dto.status, ISSUE_TRANSITIONS);
      issue.status = dto.status;
      const ts = issueTimestamps(dto.status);
      if (ts.resolvedAt !== undefined) issue.resolvedAt = ts.resolvedAt;
      if (ts.closedAt !== undefined) issue.closedAt = ts.closedAt;
    }
    if (dto.location !== undefined) issue.location = dto.location ?? null;
    if (dto.trade !== undefined) issue.trade = dto.trade ?? null;
    if (dto.assignedToId !== undefined) issue.assignedToId = dto.assignedToId ?? null;

    await issue.save();
    return this.findById(id, organizationId, isSuperAdmin);
  }

  async assign(
    id: string,
    organizationId: string,
    assignedToId: string,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const issue = await this.issueModel.findOne(filter);
    if (!issue) throw new NotFoundException('Issue not found');

    issue.assignedToId = assignedToId;
    await issue.save();
    return this.findById(id, organizationId, isSuperAdmin);
  }

  async addComment(
    id: string,
    organizationId: string,
    authorId: string,
    dto: AddIssueCommentDto,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const issue = await this.issueModel.findOne(filter);
    if (!issue) throw new NotFoundException('Issue not found');

    issue.comments.push({ authorId, body: dto.body } as any);
    await issue.save();

    return issue.comments[issue.comments.length - 1];
  }

  async softDelete(
    id: string,
    organizationId: string,
    isSuperAdmin: boolean,
  ) {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const issue = await this.issueModel.findOne(filter);
    if (!issue) throw new NotFoundException('Issue not found');

    await this.issueModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return { message: 'Issue deleted successfully' };
  }
}
