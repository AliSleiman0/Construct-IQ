import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// pdf-parse runs a debug self-test on require() that touches the filesystem.
// Stub it before the service file is evaluated. The runtime import resolves
// `default` under esModuleInterop, so we expose the mock as a default export.
const pdfParseMock = jest.fn(async (_buffer: Buffer) => ({ text: 'parsed bid text' }));
jest.mock('pdf-parse', () => ({ __esModule: true, default: pdfParseMock }));

import { BidsService } from './bids.service';
import { Bid, BidExtractionStatus, BidPriceBasis } from './schemas/bid.schema';
import { Project } from '../projects/schemas/project.schema';
import { DocumentsService } from '../documents/documents.service';
import { BidExtractorAgent } from '../ai/agents/bid-extractor.agent';

describe('BidsService', () => {
  let service: BidsService;
  let bidModel: any;
  let projectModel: any;
  let documentsService: { uploadAndCreate: jest.Mock };
  let bidExtractor: { extract: jest.Mock };

  const makeBidDoc = (overrides: Record<string, any> = {}): any => ({
    _id: 'b-1',
    organizationId: 'org-1',
    projectId: 'p-1',
    tradePackage: 'Electrical - Block A',
    sourceDocumentId: 'd-1',
    extractionStatus: BidExtractionStatus.PENDING as BidExtractionStatus,
    extractedData: null as any,
    aiRawResponse: null as any,
    extractionError: null as string | null,
    extractedAt: null as Date | null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(async () => {
    bidModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    projectModel = { findOne: jest.fn() };
    documentsService = { uploadAndCreate: jest.fn() };
    bidExtractor = { extract: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BidsService,
        { provide: getModelToken(Bid.name), useValue: bidModel },
        { provide: getModelToken(Project.name), useValue: projectModel },
        { provide: DocumentsService, useValue: documentsService },
        { provide: BidExtractorAgent, useValue: bidExtractor },
      ],
    }).compile();
    service = moduleRef.get(BidsService);
    pdfParseMock.mockClear();
  });

  const goodDto = { projectId: 'p-1', tradePackage: 'Electrical - Block A' };
  const pdfFile = {
    buffer: Buffer.from('%PDF-1.4'),
    originalname: 'bid-a.pdf',
    mimetype: 'application/pdf',
    size: 8,
  };

  describe('uploadAndExtract', () => {
    it('throws BadRequest when no files are provided', async () => {
      await expect(
        service.uploadAndExtract('org-1', 'u-1', false, goodDto, []),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when more than 10 files are uploaded', async () => {
      const files = Array.from({ length: 11 }, (_, i) => ({
        ...pdfFile,
        originalname: `bid-${i}.pdf`,
      }));
      await expect(
        service.uploadAndExtract('org-1', 'u-1', false, goodDto, files),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects non-PDF mime types', async () => {
      await expect(
        service.uploadAndExtract('org-1', 'u-1', false, goodDto, [
          { ...pdfFile, mimetype: 'application/msword' },
        ]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound when the project is not accessible to the org', async () => {
      projectModel.findOne.mockReturnValue({
        select: () => ({ lean: () => Promise.resolve(null) }),
      });
      await expect(
        service.uploadAndExtract('org-1', 'u-1', false, goodDto, [pdfFile]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('marks the bid COMPLETE on a successful extraction', async () => {
      projectModel.findOne.mockReturnValue({
        select: () => ({ lean: () => Promise.resolve({ _id: 'p-1' }) }),
      });
      documentsService.uploadAndCreate.mockResolvedValue({ _id: 'd-1' });
      const bidDoc = makeBidDoc();
      bidModel.create.mockResolvedValue(bidDoc);
      bidExtractor.extract.mockResolvedValue({
        data: {
          contractor: 'Acme Electrical',
          trade: 'Electrical',
          total_price: 100000,
          currency: 'USD',
          price_basis: BidPriceBasis.LUMP_SUM,
          inclusions: [],
          exclusions: [],
          payment_terms: { advance_percent: 30, structure: '30/40/30' },
          validity_days: 30,
          warranty_months: 12,
          red_flags: [],
          scope_completeness_score: 90,
          summary: 'Comprehensive lump-sum electrical bid.',
        },
        raw: { ok: true },
      });

      const result = await service.uploadAndExtract('org-1', 'u-1', false, goodDto, [pdfFile]);

      expect(documentsService.uploadAndCreate).toHaveBeenCalledWith(
        'org-1',
        'u-1',
        pdfFile,
        expect.objectContaining({ projectId: 'p-1' }),
      );
      expect(bidExtractor.extract).toHaveBeenCalledWith('parsed bid text');
      expect(bidDoc.extractionStatus).toBe(BidExtractionStatus.COMPLETE);
      expect(bidDoc.extractedData?.contractor).toBe('Acme Electrical');
      expect(bidDoc.aiRawResponse).toEqual({ ok: true });
      expect(bidDoc.extractedAt).toBeInstanceOf(Date);
      expect(bidDoc.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('marks the bid FAILED but does not throw when extraction errors', async () => {
      projectModel.findOne.mockReturnValue({
        select: () => ({ lean: () => Promise.resolve({ _id: 'p-1' }) }),
      });
      documentsService.uploadAndCreate.mockResolvedValue({ _id: 'd-1' });
      const bidDoc = makeBidDoc();
      bidModel.create.mockResolvedValue(bidDoc);
      bidExtractor.extract.mockRejectedValue(new Error('OpenAI down'));

      const result = await service.uploadAndExtract('org-1', 'u-1', false, goodDto, [pdfFile]);

      expect(bidDoc.extractionStatus).toBe(BidExtractionStatus.FAILED);
      expect(bidDoc.extractionError).toContain('OpenAI down');
      expect(bidDoc.save).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('processes a batch where some bids fail and others succeed', async () => {
      projectModel.findOne.mockReturnValue({
        select: () => ({ lean: () => Promise.resolve({ _id: 'p-1' }) }),
      });
      documentsService.uploadAndCreate
        .mockResolvedValueOnce({ _id: 'd-1' })
        .mockResolvedValueOnce({ _id: 'd-2' });
      const bidA = makeBidDoc({ _id: 'b-1' });
      const bidB = makeBidDoc({ _id: 'b-2' });
      bidModel.create.mockResolvedValueOnce(bidA).mockResolvedValueOnce(bidB);
      bidExtractor.extract
        .mockResolvedValueOnce({
          data: {
            contractor: 'A',
            trade: 'E',
            total_price: 1,
            currency: 'USD',
            price_basis: BidPriceBasis.LUMP_SUM,
            inclusions: [],
            exclusions: [],
            payment_terms: { advance_percent: null, structure: '' },
            validity_days: null,
            warranty_months: null,
            red_flags: [],
            scope_completeness_score: 50,
            summary: '',
          },
          raw: {},
        })
        .mockRejectedValueOnce(new Error('parse fail'));

      const results = await service.uploadAndExtract('org-1', 'u-1', false, goodDto, [
        { ...pdfFile, originalname: 'a.pdf' },
        { ...pdfFile, originalname: 'b.pdf' },
      ]);

      expect(results).toHaveLength(2);
      expect(bidA.extractionStatus).toBe(BidExtractionStatus.COMPLETE);
      expect(bidB.extractionStatus).toBe(BidExtractionStatus.FAILED);
    });
  });

  describe('list', () => {
    it('scopes by organizationId for non-super-admin', async () => {
      const lean = jest.fn().mockResolvedValue([]);
      const sort = jest.fn().mockReturnValue({ lean });
      bidModel.find.mockReturnValue({ sort });
      await service.list('org-1', false, {});
      expect(bidModel.find).toHaveBeenCalledWith({ organizationId: 'org-1' });
    });

    it('drops org scope for super admin', async () => {
      const lean = jest.fn().mockResolvedValue([]);
      const sort = jest.fn().mockReturnValue({ lean });
      bidModel.find.mockReturnValue({ sort });
      await service.list('org-1', true, { projectId: 'p-1' });
      expect(bidModel.find).toHaveBeenCalledWith({ projectId: 'p-1' });
    });
  });

  describe('remove', () => {
    it('throws NotFound when the bid is not in the caller org', async () => {
      bidModel.findOne.mockResolvedValue(null);
      await expect(service.remove('b-1', 'org-1', false)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('soft-deletes via deletedAt', async () => {
      bidModel.findOne.mockResolvedValue(makeBidDoc());
      await service.remove('b-1', 'org-1', false);
      expect(bidModel.updateOne).toHaveBeenCalledWith(
        { _id: 'b-1' },
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });
  });
});
