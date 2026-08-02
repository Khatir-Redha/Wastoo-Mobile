import api from '../lib/api';

class KycService {
  /**
   * Get the current user's KYC applications
   */
  async getMyKyc() {
    const response = await api.get('/kyc/my');
    return response.data;
  }

  /**
   * Submit (or resubmit) a KYC application.
   * Uses PATCH /kyc/re-submit instead of POST /kyc because the backend's
   * POST endpoint crashes when the user has no existing PENDING application.
   * PATCH /kyc/re-submit correctly handles both new and existing applications.
   */
  async submitApplication(data: { document_type: string; document_url: string }) {
    const response = await api.patch('/kyc/re-submit', data);
    return response.data;
  }
}

export default new KycService();
