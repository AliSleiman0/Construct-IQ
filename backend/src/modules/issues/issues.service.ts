import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Issue, IssueDocument } from './schemas/issue.schema';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { AddIssueCommentDto } from './dto/add-issue-comment.dto';
import { IssueStatus } from '../../common/enums';

@Injectable()
export class IssuesService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
  ) {}

  async findAll(
    organizationId: string,
    isSuperAdmin: boolean,
    projectId?: string,
    status?: IssueStatus,
    severity?: string,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = isSuperAdmin
      ? {}
      : { organizationId };

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    return this.issueModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async findById(id: string, organizationId: string, isSuperAdmin: boolean): Promise<any> {
    const filter = isSuperAdmin ? { _id: id } : { _id: id, organizationId };
    const issue = await this.issueModel.findOne(filter).lean();
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
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
    if (dto.status !== undefined) issue.status = dto.status;
    if (dto.location !== undefined) issue.location = dto.location ?? null;
    if (dto.trade !== undefined) issue.trade = dto.trade ?? null;
    if (dto.assignedToId !== undefined) issue.assignedToId = dto.assignedToId ?? null;
    if (dto.resolvedAt !== undefined)
      issue.resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : null;

    await issue.save();
    return issue.toObject();
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
    return issue.toObject();
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
