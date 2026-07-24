import api from '../../lib/api';

export interface KycMeResponse {
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | null;
  last_application?: {
    full_name: string;
    phone: string;
  };
}

export interface SubmitKycDto {
  full_name: string;
  phone: string;
}

export interface UploadDocumentDto {
  document_type: 'NATIONAL_ID' | 'SELFIE';
  document_url: string;
}

class KycService {
  static async getMyKyc(): Promise<KycMeResponse> {
    const response = await api.get('/kyc/me');
    return response.data;
  }

  static async submitKyc(data: SubmitKycDto): Promise<void> {
    await api.post('/kyc', data);
  }

  static async uploadDocument(data: UploadDocumentDto): Promise<void> {
    await api.post('/kyc/documents', data);
  }
}

export default KycService;
