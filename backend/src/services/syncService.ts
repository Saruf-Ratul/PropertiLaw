import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { RentManagerService } from './integrations/rentManagerService';
import { YardiService } from './integrations/yardiService';

const prisma = new PrismaClient();

/**
 * Data Synchronization Service
 * Handles syncing data from PMS systems (RentManager, Yardi) to PropertiLaw
 */
export class SyncService {
  /**
   * Sync data for a specific client integration
   */
  static async syncClientIntegration(integrationId: string): Promise<void> {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        client: true
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    try {
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncStatus: 'IN_PROGRESS',
          lastSyncAt: new Date()
        }
      });

      if (integration.type === 'RENTMANAGER_API') {
        await this.syncRentManager(integration);
      } else if (integration.type === 'YARDI_API' || integration.type === 'YARDI_SFTP') {
        await this.syncYardi(integration);
      }

      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'CONNECTED',
          lastSyncStatus: 'SUCCESS',
          lastSyncError: null
        }
      });
    } catch (error: any) {
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'ERROR',
          lastSyncStatus: 'FAILED',
          lastSyncError: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Sync data from RentManager
   */
  private static async syncRentManager(integration: any): Promise<void> {
    if (!integration.apiKey) {
      throw new Error('RentManager API key not configured');
    }

    const rmService = new RentManagerService(
      integration.apiKey,
      integration.apiUrl || undefined
    );

    // Test connection
    const isConnected = await rmService.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to RentManager API');
    }

    // Fetch and sync properties
    const rmProperties = await rmService.fetchProperties();
    for (const rmProp of rmProperties) {
      const propertyData = rmService.mapPropertyToPropertiLaw(rmProp, integration.clientId);

      await prisma.property.upsert({
        where: {
          externalId_clientId: {
            externalId: propertyData.externalId!,
            clientId: integration.clientId
          }
        },
        update: propertyData,
        create: propertyData
      });

      // Fetch and sync units
      const rmUnits = await rmService.fetchUnits(rmProp.id);
      for (const rmUnit of rmUnits) {
        const unit = await prisma.unit.upsert({
          where: {
            externalId_propertyId: {
              externalId: rmUnit.id?.toString(),
              propertyId: propertyData.id || ''
            }
          },
          update: {
            unitNumber: rmUnit.unitNumber || rmUnit.name || 'Unknown',
            lastSynced: new Date()
          },
          create: {
            externalId: rmUnit.id?.toString(),
            unitNumber: rmUnit.unitNumber || rmUnit.name || 'Unknown',
            propertyId: propertyData.id || '',
            lastSynced: new Date()
          }
        });
      }

      // Fetch and sync tenants
      const rmTenants = await rmService.fetchTenants(rmProp.id);
      for (const rmTenant of rmTenants) {
        const tenantData = rmService.mapTenantToPropertiLaw(
          rmTenant,
          integration.clientId,
          propertyData.id,
          undefined // Unit ID would need to be matched
        );

        await prisma.tenant.upsert({
          where: {
            externalId_clientId: {
              externalId: tenantData.externalId!,
              clientId: integration.clientId
            }
          },
          update: tenantData,
          create: tenantData
        });
      }
    }
  }

  /**
   * Sync data from Yardi (SFTP CSV)
   */
  private static async syncYardi(integration: any): Promise<void> {
    if (!integration.sftpHost || !integration.sftpUser || !integration.sftpPassword) {
      throw new Error('Yardi SFTP credentials not configured');
    }

    const yardiService = new YardiService({
      host: integration.sftpHost,
      port: integration.sftpPort || 22,
      username: integration.sftpUser,
      password: integration.sftpPassword,
      remotePath: integration.sftpPath || '/'
    });

    // Test connection
    const isConnected = await yardiService.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Yardi SFTP');
    }

    // List and process CSV files
    const csvFiles = await yardiService.listCSVFiles();
    const tempDir = './temp';

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    for (const fileName of csvFiles) {
      if (fileName.includes('properties') || fileName.includes('Properties')) {
        const properties = await yardiService.downloadAndParseCSV(fileName, tempDir);
        for (const prop of properties) {
          const propertyData = yardiService.mapPropertyToPropertiLaw(prop, integration.clientId);
          await prisma.property.upsert({
            where: {
              externalId_clientId: {
                externalId: propertyData.externalId!,
                clientId: integration.clientId
              }
            },
            update: propertyData,
            create: propertyData
          });
        }
      } else if (fileName.includes('tenants') || fileName.includes('Tenants')) {
        const tenants = await yardiService.downloadAndParseCSV(fileName, tempDir);
        for (const tenant of tenants) {
          const tenantData = yardiService.mapTenantToPropertiLaw(
            tenant,
            integration.clientId
          );
          await prisma.tenant.upsert({
            where: {
              externalId_clientId: {
                externalId: tenantData.externalId!,
                clientId: integration.clientId
              }
            },
            update: tenantData,
            create: tenantData
          });
        }
      }
    }
  }

  /**
   * Sync all active integrations
   */
  static async syncAll(): Promise<void> {
    const integrations = await prisma.integration.findMany({
      where: {
        status: 'CONNECTED'
      }
    });

    for (const integration of integrations) {
      try {
        await this.syncClientIntegration(integration.id);
      } catch (error) {
        console.error(`Failed to sync integration ${integration.id}:`, error);
      }
    }
  }
}

