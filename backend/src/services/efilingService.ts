import axios, { AxiosInstance } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * E-Filing Service
 * Handles electronic court filing integration
 * Supports multiple e-filing providers (Tyler Odyssey, File & ServeXpress, etc.)
 */
export class EFilingService {
  private provider: 'tyler-odyssey' | 'file-servexpress' | 'custom';
  private apiClient: AxiosInstance;
  private config: any;

  constructor(provider: string, config: any) {
    this.provider = provider as any;
    this.config = config;
    
    // Initialize API client based on provider
    this.apiClient = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey || ''}`
      },
      timeout: 60000 // 60 seconds for filing
    });
  }

  /**
   * Submit filing to court system
   */
  async submitFiling(filingData: {
    caseId: string;
    documents: Array<{ path: string; type: string }>;
    caseType: string;
    parties: Array<{ name: string; role: string }>;
    court: string;
    jurisdiction: string;
  }): Promise<{
    success: boolean;
    courtCaseNumber?: string;
    filingId?: string;
    hearingDate?: Date;
    fees?: number;
    error?: string;
  }> {
    try {
      // Prepare filing packet based on provider
      const filingPacket = await this.prepareFilingPacket(filingData);

      // Submit to court system
      let response;
      switch (this.provider) {
        case 'tyler-odyssey':
          response = await this.submitToTylerOdyssey(filingPacket);
          break;
        case 'file-servexpress':
          response = await this.submitToFileServeXpress(filingPacket);
          break;
        default:
          response = await this.submitToCustomProvider(filingPacket);
      }

      return {
        success: true,
        courtCaseNumber: response.caseNumber,
        filingId: response.filingId,
        hearingDate: response.hearingDate ? new Date(response.hearingDate) : undefined,
        fees: response.fees
      };
    } catch (error: any) {
      console.error('E-filing submission error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit filing'
      };
    }
  }

  /**
   * Prepare filing packet with all required documents and metadata
   */
  private async prepareFilingPacket(filingData: any): Promise<any> {
    // Get case details
    const caseData = await prisma.case.findUnique({
      where: { id: filingData.caseId },
      include: {
        property: true,
        tenants: {
          include: {
            tenant: true
          }
        },
        documents: {
          where: {
            type: { in: ['COMPLAINT', 'COVER_SHEET', 'FILING_FEE_WAIVER'] }
          }
        }
      }
    });

    if (!caseData) {
      throw new Error('Case not found');
    }

    // Prepare parties information
    const parties = [
      {
        name: caseData.property.name,
        role: 'PLAINTIFF',
        type: 'ORGANIZATION'
      },
      ...caseData.tenants.map(ct => ({
        name: `${ct.tenant.firstName} ${ct.tenant.lastName}`,
        role: 'DEFENDANT',
        type: 'INDIVIDUAL'
      }))
    ];

    // Prepare documents
    const documents = caseData.documents.map(doc => ({
      type: doc.type,
      path: doc.filePath,
      name: doc.name
    }));

    return {
      caseType: caseData.type,
      jurisdiction: caseData.jurisdiction,
      court: caseData.court,
      parties,
      documents,
      metadata: {
        amountOwed: caseData.amountOwed,
        reason: caseData.reason,
        filedDate: new Date().toISOString()
      }
    };
  }

  /**
   * Submit to Tyler Odyssey e-filing system
   */
  private async submitToTylerOdyssey(packet: any): Promise<any> {
    // Tyler Odyssey API format
    const payload = {
      Filing: {
        Court: packet.court,
        CaseType: packet.caseType,
        Parties: packet.parties.map((p: any) => ({
          Name: p.name,
          Role: p.role,
          PartyType: p.type
        })),
        Documents: packet.documents.map((d: any) => ({
          DocumentType: d.type,
          FileName: d.name,
          FilePath: d.path
        })),
        FilingDate: packet.metadata.filedDate
      }
    };

    const response = await this.apiClient.post('/api/v1/filings', payload);
    
    return {
      caseNumber: response.data.CaseNumber,
      filingId: response.data.FilingId,
      hearingDate: response.data.HearingDate,
      fees: response.data.FilingFees
    };
  }

  /**
   * Submit to File & ServeXpress e-filing system
   */
  private async submitToFileServeXpress(packet: any): Promise<any> {
    // File & ServeXpress API format
    const payload = {
      court_code: packet.court,
      case_type: packet.caseType,
      parties: packet.parties,
      documents: packet.documents,
      filing_date: packet.metadata.filedDate
    };

    const response = await this.apiClient.post('/api/filings', payload);
    
    return {
      caseNumber: response.data.case_number,
      filingId: response.data.filing_id,
      hearingDate: response.data.hearing_date,
      fees: response.data.fees
    };
  }

  /**
   * Submit to custom provider
   */
  private async submitToCustomProvider(packet: any): Promise<any> {
    // Generic API submission
    const response = await this.apiClient.post('/api/filings', packet);
    
    return {
      caseNumber: response.data.caseNumber || response.data.case_number,
      filingId: response.data.filingId || response.data.filing_id,
      hearingDate: response.data.hearingDate || response.data.hearing_date,
      fees: response.data.fees || response.data.filingFees
    };
  }

  /**
   * Check filing status
   */
  async checkFilingStatus(filingId: string): Promise<{
    status: string;
    courtCaseNumber?: string;
    hearingDate?: Date;
    errors?: string[];
  }> {
    try {
      const response = await this.apiClient.get(`/api/filings/${filingId}/status`);
      
      return {
        status: response.data.status,
        courtCaseNumber: response.data.caseNumber,
        hearingDate: response.data.hearingDate ? new Date(response.data.hearingDate) : undefined,
        errors: response.data.errors
      };
    } catch (error: any) {
      console.error('Check filing status error:', error);
      return {
        status: 'ERROR',
        errors: [error.message]
      };
    }
  }

  /**
   * Get filing fees for a court
   */
  async getFilingFees(court: string, caseType: string): Promise<{
    filingFee: number;
    serviceFee: number;
    totalFee: number;
  }> {
    try {
      const response = await this.apiClient.get(`/api/courts/${court}/fees`, {
        params: { case_type: caseType }
      });
      
      return {
        filingFee: response.data.filingFee || response.data.filing_fee || 0,
        serviceFee: response.data.serviceFee || response.data.service_fee || 0,
        totalFee: (response.data.filingFee || 0) + (response.data.serviceFee || 0)
      };
    } catch (error) {
      // Return default fees if API unavailable
      return {
        filingFee: 75.00,
        serviceFee: 5.00,
        totalFee: 80.00
      };
    }
  }

  /**
   * Format documents for court requirements
   */
  async formatDocumentsForCourt(documents: Array<{ path: string; type: string }>, court: string): Promise<Array<{ path: string; format: string }>> {
    // This would format documents according to court-specific requirements
    // For now, return as-is (would need PDF processing library)
    return documents.map(doc => ({
      path: doc.path,
      format: 'PDF' // Would determine based on court requirements
    }));
  }
}

/**
 * Court Configuration
 * Maps courts to their e-filing providers
 */
export const COURT_CONFIGS: Record<string, {
  provider: string;
  apiUrl: string;
  requiresAuth: boolean;
}> = {
  'Essex County Superior Court': {
    provider: 'tyler-odyssey',
    apiUrl: 'https://efile.essexcourts.nj.gov',
    requiresAuth: true
  },
  'Hudson County Superior Court': {
    provider: 'tyler-odyssey',
    apiUrl: 'https://efile.hudsoncourts.nj.gov',
    requiresAuth: true
  },
  'Bergen County Superior Court': {
    provider: 'file-servexpress',
    apiUrl: 'https://api.fileservexpress.com',
    requiresAuth: true
  }
  // Add more courts as needed
};

/**
 * Get e-filing service for a court
 */
export function getEFilingService(court: string, credentials: any): EFilingService | null {
  const config = COURT_CONFIGS[court];
  if (!config) {
    return null;
  }

  return new EFilingService(config.provider, {
    apiUrl: config.apiUrl,
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    ...credentials
  });
}

