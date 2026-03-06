export type User = 'Ед' | 'Вася' | 'Ден';

export interface Account {
  id: string;
  name: string;
  userId: User;
  proxy?: string;
  walletAddress?: string;
  color?: string;
  deleted?: boolean;
  updatedAt?: string;
}

export interface MarketMetrics {
  tvl?: string;
  volume24h?: string;
  openInterest?: string;
}

export interface ProjectLinks {
  docs?: string;
  defillama?: string;
  website?: string;
}

export interface Project {
  id: string;
  name: string;
  ticker?: string;
  defillamaId?: string; // Slug for API calls
  description?: string;
  metrics?: MarketMetrics;
  links?: ProjectLinks;
}

export interface Transaction {
  id: string;
  date: string; // ISO string - record creation date
  updatedAt?: string; // ISO string - last update
  deleted?: boolean; // Soft delete flag
  
  startDate: string; // Start of the activity period (Required now)
  endDate: string; // End of the activity period (Required now)
  userId: User;
  accountId?: string; // Optional for backward compatibility
  projectId: string;
  
  // New combined structure
  spent: number;  // Money spent in USD
  volume: number; // Volume generated in USD
  points: number; // Points earned
  
  note?: string;
}

export interface SyncConfig {
  enabled: boolean;
  supabaseUrl: string;
  supabaseKey: string;
  tableName: string; // usually 'sync_store'
  rowId: string;     // usually 'cryptoxata_v1'
}

export interface AppState {
  transactions: Transaction[];
  projects: Project[];
  accounts: Account[];
  syncConfig?: SyncConfig;
}