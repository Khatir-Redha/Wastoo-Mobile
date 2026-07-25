import api from '../lib/api';

class KycService {
  /**
   * Get the current user's KYC applications
   */
  async getMyKyc() {
    const response = await api.get('/kyc/me');
    return response.data;
  }

  /**
   * Request a signed URL for document upload
   */
  async getSignedUrl(filename: string, contentType: string): Promise<{ signedUrl: string, documentUrl: string }> {
    const response = await api.post('/kyc/signed-url', { filename, contentType });
    return response.data;
  }

  /**
   * Submit the KYC application
   */
  async submitKyc(data: { name: string; phone: string; documents: { document_type: string; document_url: string }[] }) {
    const response = await api.post('/kyc', data);
    return response.data;
  }

  /**
   * Resubmit a rejected KYC application
   */
  async resubmitKyc(data: { name: string; phone: string; documents: { document_type: string; document_url: string }[] }) {
    const response = await api.patch('/kyc/resubmit', data);
    return response.data;
  }
}

export default new KycService();
