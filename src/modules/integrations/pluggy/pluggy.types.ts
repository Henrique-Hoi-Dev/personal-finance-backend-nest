export interface PluggyAccount {
  id: string;
  name: string;
  type: string;
  // add other relevant fields
}

export interface PluggyAccountResponse {
  results: PluggyAccount[];
}

export interface PluggyConnectTokenRequest {
  clientUserId: string;
  itemId?: string;
}

export interface PluggyConnectTokenResponse {
  connectToken: string;
  expiresAt: string;
}
