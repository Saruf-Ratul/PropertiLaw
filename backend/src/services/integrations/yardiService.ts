import SftpClient from 'ssh2-sftp-client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

/**
 * Yardi Breeze Integration Service
 * Handles data synchronization via SFTP CSV imports
 */
export class YardiService {
  private sftpClient: SftpClient;
  private config: {
    host: string;
    port: number;
    username: string;
    password: string;
    remotePath: string;
  };

  constructor(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    remotePath: string;
  }) {
    this.config = config;
    this.sftpClient = new SftpClient();
  }

  /**
   * Test SFTP connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.sftpClient.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password
      });
      await this.sftpClient.end();
      return true;
    } catch (error) {
      console.error('Yardi SFTP connection test failed:', error);
      return false;
    }
  }

  /**
   * Download and parse CSV files from SFTP
   */
  async downloadAndParseCSV(fileName: string, localPath: string): Promise<any[]> {
    try {
      await this.sftpClient.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password
      });

      const remoteFilePath = path.join(this.config.remotePath, fileName);
      const localFilePath = path.join(localPath, fileName);

      // Download file
      await this.sftpClient.fastGet(remoteFilePath, localFilePath);
      await this.sftpClient.end();

      // Parse CSV
      return await this.parseCSV(localFilePath);
    } catch (error) {
      console.error(`Error downloading CSV ${fileName}:`, error);
      throw new Error(`Failed to download CSV file: ${fileName}`);
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * List available CSV files on SFTP server
   */
  async listCSVFiles(): Promise<string[]> {
    try {
      await this.sftpClient.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password
      });

      const files = await this.sftpClient.list(this.config.remotePath);
      await this.sftpClient.end();

      return files
        .filter(file => file.name.endsWith('.csv'))
        .map(file => file.name);
    } catch (error) {
      console.error('Error listing CSV files:', error);
      throw new Error('Failed to list CSV files');
    }
  }

  /**
   * Map Yardi property CSV data to PropertiLaw format
   */
  mapPropertyToPropertiLaw(yardiProperty: any, clientId: string): any {
    return {
      externalId: yardiProperty.PropertyID || yardiProperty.ID,
      name: yardiProperty.PropertyName || yardiProperty.Name || 'Unnamed Property',
      address: yardiProperty.Address || yardiProperty.StreetAddress || '',
      city: yardiProperty.City || '',
      state: yardiProperty.State || '',
      zipCode: yardiProperty.ZipCode || yardiProperty.PostalCode || '',
      county: yardiProperty.County || '',
      jurisdiction: this.determineJurisdiction(yardiProperty),
      clientId,
      lastSynced: new Date()
    };
  }

  /**
   * Map Yardi tenant CSV data to PropertiLaw format
   */
  mapTenantToPropertiLaw(yardiTenant: any, clientId: string, propertyId?: string, unitId?: string): any {
    return {
      externalId: yardiTenant.TenantID || yardiTenant.ID,
      firstName: yardiTenant.FirstName || yardiTenant['First Name'] || '',
      lastName: yardiTenant.LastName || yardiTenant['Last Name'] || '',
      email: yardiTenant.Email || null,
      phone: yardiTenant.Phone || yardiTenant.MobilePhone || null,
      propertyId: propertyId || null,
      unitId: unitId || null,
      clientId,
      currentBalance: parseFloat(yardiTenant.Balance || yardiTenant.CurrentBalance || '0'),
      leaseStartDate: yardiTenant.LeaseStartDate ? new Date(yardiTenant.LeaseStartDate) : null,
      leaseEndDate: yardiTenant.LeaseEndDate ? new Date(yardiTenant.LeaseEndDate) : null,
      isActive: yardiTenant.Status === 'Active' || yardiTenant.Status === 'Current',
      lastSynced: new Date()
    };
  }

  /**
   * Determine jurisdiction based on property location
   */
  private determineJurisdiction(property: any): string {
    const county = property.County || '';
    const state = property.State || '';
    return `${county} County, ${state}`.trim();
  }
}

/**
 * Yardi API Integration Service (if API access is available)
 */
export class YardiAPIService {
  private apiClient: any;
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl?: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl || 'https://api.yardi.com';
    // Initialize API client if Yardi provides SDK
  }

  /**
   * Fetch properties via Yardi API
   */
  async fetchProperties(): Promise<any[]> {
    // TODO: Implement when Yardi API documentation is available
    throw new Error('Yardi API integration not yet implemented');
  }

  /**
   * Fetch tenants via Yardi API
   */
  async fetchTenants(): Promise<any[]> {
    // TODO: Implement when Yardi API documentation is available
    throw new Error('Yardi API integration not yet implemented');
  }
}

