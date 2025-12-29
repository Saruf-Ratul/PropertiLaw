import axios, { AxiosInstance } from 'axios';

/**
 * RentManager API Integration Service
 * Handles data synchronization with RentManager property management system
 */
export class RentManagerService {
  private apiClient: AxiosInstance;
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl?: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl || process.env.RENTMANAGER_API_URL || 'https://api.rentmanager.com';
    
    this.apiClient = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Test connection to RentManager API
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.apiClient.get('/v1/ping');
      return response.status === 200;
    } catch (error) {
      console.error('RentManager connection test failed:', error);
      return false;
    }
  }

  /**
   * Fetch all properties from RentManager
   */
  async fetchProperties(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/v1/properties', {
        params: {
          status: 'Active',
          limit: 1000
        }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching properties from RentManager:', error);
      throw new Error('Failed to fetch properties from RentManager');
    }
  }

  /**
   * Fetch all units for a property
   */
  async fetchUnits(propertyId: string): Promise<any[]> {
    try {
      const response = await this.apiClient.get(`/v1/properties/${propertyId}/units`);
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching units for property ${propertyId}:`, error);
      throw new Error('Failed to fetch units from RentManager');
    }
  }

  /**
   * Fetch all active tenants
   */
  async fetchTenants(propertyId?: string): Promise<any[]> {
    try {
      const params: any = {
        status: 'Active',
        limit: 1000
      };
      
      if (propertyId) {
        params.propertyId = propertyId;
      }

      const response = await this.apiClient.get('/v1/tenants', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching tenants from RentManager:', error);
      throw new Error('Failed to fetch tenants from RentManager');
    }
  }

  /**
   * Fetch tenant balance/ledger information
   */
  async fetchTenantBalance(tenantId: string): Promise<number> {
    try {
      const response = await this.apiClient.get(`/v1/tenants/${tenantId}/balance`);
      return parseFloat(response.data.balance || '0');
    } catch (error) {
      console.error(`Error fetching balance for tenant ${tenantId}:`, error);
      return 0;
    }
  }

  /**
   * Update RentManager with case information (write-back)
   */
  async updateTenantNote(tenantId: string, note: string): Promise<boolean> {
    try {
      await this.apiClient.post(`/v1/tenants/${tenantId}/notes`, {
        note,
        type: 'Eviction',
        date: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error(`Error updating tenant note for ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Map RentManager property data to PropertiLaw format
   */
  mapPropertyToPropertiLaw(rmProperty: any, clientId: string): any {
    return {
      externalId: rmProperty.id?.toString(),
      name: rmProperty.name || rmProperty.propertyName || 'Unnamed Property',
      address: rmProperty.address || rmProperty.streetAddress || '',
      city: rmProperty.city || '',
      state: rmProperty.state || '',
      zipCode: rmProperty.zipCode || rmProperty.postalCode || '',
      county: rmProperty.county || '',
      jurisdiction: this.determineJurisdiction(rmProperty),
      clientId,
      lastSynced: new Date()
    };
  }

  /**
   * Map RentManager tenant data to PropertiLaw format
   */
  mapTenantToPropertiLaw(rmTenant: any, clientId: string, propertyId?: string, unitId?: string): any {
    return {
      externalId: rmTenant.id?.toString(),
      firstName: rmTenant.firstName || '',
      lastName: rmTenant.lastName || '',
      email: rmTenant.email || null,
      phone: rmTenant.phone || rmTenant.mobilePhone || null,
      propertyId: propertyId || null,
      unitId: unitId || null,
      clientId,
      currentBalance: parseFloat(rmTenant.balance || rmTenant.currentBalance || '0'),
      leaseStartDate: rmTenant.leaseStartDate ? new Date(rmTenant.leaseStartDate) : null,
      leaseEndDate: rmTenant.leaseEndDate ? new Date(rmTenant.leaseEndDate) : null,
      isActive: rmTenant.status === 'Active',
      lastSynced: new Date()
    };
  }

  /**
   * Determine jurisdiction based on property location
   */
  private determineJurisdiction(property: any): string {
    const county = property.county || '';
    const state = property.state || '';
    return `${county} County, ${state}`.trim();
  }
}

