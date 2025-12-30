const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || '/api';

// ====================
// Enums
// ====================

export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7
}

export enum VoteSupport {
  Against = 0,
  For = 1,
  Abstain = 2
}

export enum EventType {
  ProposalCreated = 'ProposalCreated',
  VoteCast = 'VoteCast',
  ProposalQueued = 'ProposalQueued',
  ProposalExecuted = 'ProposalExecuted',
  ProposalCanceled = 'ProposalCanceled',
  DelegateChanged = 'DelegateChanged'
}

// ====================
// Legacy Interfaces (Keep for backward compatibility)
// ====================

export interface ProposalFromAPI {
  id: number;
  description: string;
  creator: string;
  created: {
    id: number;
    creator: string;
    description: string;
    blockNumber: number;
  };
  votes: Array<{
    id: number;
    voter: string;
    support: boolean;
    blockNumber: number;
  }>;
  executed?: {
    id: number;
    executor: string;
    blockNumber: number;
  };
}

export interface VotingResults {
  proposalId: number;
  forVotes: number;
  againstVotes: number;
  totalVotes: number;
}

// ====================
// New Enhanced Interfaces
// ====================

export interface ProposalDetailed {
  proposalId: string;
  proposer: string;
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
  voteStart: string;
  voteEnd: string;
  description: string;
  createdAtBlock: number;
  createdAtTimestamp?: number;
  state?: ProposalState;
  etaSeconds?: string;
  forVotes?: string;
  againstVotes?: string;
  abstainVotes?: string;
}

export interface PreparedTransaction {
  to: string;
  data: string;
  value?: string;
  gasLimit?: string;
}

export interface VoteRequest {
  proposalId: string;
  support: VoteSupport;
  reason?: string;
  voterAddress: string;
}

export interface QueueRequest {
  proposalId: string;
  userAddress: string;
}

export interface ExecuteRequest {
  proposalId: string;
  userAddress: string;
}

export interface CancelRequest {
  proposalId: string;
  userAddress: string;
}

export interface CreateProposalRequest {
  proposerAddress: string;
  targets: string[];
  values: string[];
  calldatas: string[];
  description: string;
}

export interface CreateProposalResponse {
  success: boolean;
  message: string;
  error?: string;
  description?: string;
  votingPower?: string;
  proposalThreshold?: string;
  required?: string;
  current?: string;
  transactionData?: {
    to: string;
    data: string;
    from: string;
  };
  note?: string;
}

export interface DAOEvent {
  type: EventType;
  blockNumber: number;
  transactionHash: string;
  timestamp?: number;
  data: any;
}

export interface EventFilters {
  eventType?: EventType;
  proposalId?: string;
  address?: string;
  fromBlock?: number;
  toBlock?: number;
}

export const proposalsAPI = {
  // ====================
  // Legacy Endpoints
  // ====================

  async getAllProposals(): Promise<ProposalFromAPI[]> {
    const response = await fetch(`${API_BASE_URL}/proposals`);
    if (!response.ok) {
      throw new Error("Failed to fetch proposals");
    }
    return response.json();
  },

  async getProposalById(id: number): Promise<ProposalFromAPI> {
    const response = await fetch(`${API_BASE_URL}/proposals/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Proposal not found");
      }
      throw new Error("Failed to fetch proposal");
    }
    return response.json();
  },

  async getVotingResults(id: number): Promise<VotingResults> {
    const response = await fetch(`${API_BASE_URL}/proposals/results/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Proposal not found");
      }
      throw new Error("Failed to fetch voting results");
    }
    return response.json();
  },

  // ====================
  // Enhanced GET Endpoints
  // ====================

  async getAllDetailedProposals(): Promise<{count: number; proposals: ProposalDetailed[]}> {
    const response = await fetch(`${API_BASE_URL}/proposals`);
    if (!response.ok) {
      throw new Error('Failed to fetch proposals');
    }
    return response.json();
  },

  async getDetailedProposal(id: string): Promise<ProposalDetailed> {
    const response = await fetch(`${API_BASE_URL}/proposals/${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Proposal not found');
      }
      throw new Error('Failed to fetch proposal');
    }
    return response.json();
  },

  async getProposalsByState(state: ProposalState): Promise<{count: number; proposals: ProposalDetailed[]}> {
    const stateMap: Record<number, string> = {
      [ProposalState.Queued]: 'queue',
      [ProposalState.Executed]: 'executed',
      [ProposalState.Canceled]: 'canceled',
      [ProposalState.Defeated]: 'defeated',
      [ProposalState.Succeeded]: 'succeeded',
      [ProposalState.Expired]: 'expired'
    };

    const endpoint = stateMap[state];
    if (!endpoint) {
      throw new Error(`No endpoint for state ${state}`);
    }

    const response = await fetch(`${API_BASE_URL}/proposals/${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint} proposals`);
    }
    return response.json();
  },

  async getEvents(filters?: EventFilters): Promise<{count: number; events: DAOEvent[]}> {
    const queryParams = new URLSearchParams();

    if (filters?.eventType) {
      queryParams.set('eventType', filters.eventType);
    }
    if (filters?.proposalId) {
      queryParams.set('proposalId', filters.proposalId);
    }
    if (filters?.address) {
      queryParams.set('address', filters.address);
    }
    if (filters?.fromBlock !== undefined) {
      queryParams.set('fromBlock', filters.fromBlock.toString());
    }
    if (filters?.toBlock !== undefined) {
      queryParams.set('toBlock', filters.toBlock.toString());
    }

    const url = `${API_BASE_URL}/proposals/events${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    return response.json();
  },

  // ====================
  // POST Endpoints (Transaction Preparation)
  // ====================

  async createProposal(request: CreateProposalRequest): Promise<CreateProposalResponse> {
    const response = await fetch(`${API_BASE_URL}/proposals/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create proposal' }));
      throw new Error(error.message || 'Failed to create proposal');
    }

    return response.json();
  },

  async prepareVoteTransaction(request: VoteRequest): Promise<PreparedTransaction> {
    const response = await fetch(`${API_BASE_URL}/proposals/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to prepare vote transaction' }));
      throw new Error(error.message || 'Failed to prepare vote transaction');
    }

    const data = await response.json();

    // Check if the backend returned an error
    if (!data.success) {
      throw new Error(data.message || data.error || 'Failed to prepare vote transaction');
    }

    // Extract transaction data
    return {
      to: data.to,
      data: data.data,
      value: data.value,
      gasLimit: data.gasLimit
    };
  },

  async prepareQueueTransaction(request: QueueRequest): Promise<PreparedTransaction> {
    const response = await fetch(`${API_BASE_URL}/proposals/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to prepare queue transaction' }));
      throw new Error(error.message || 'Failed to prepare queue transaction');
    }

    return response.json();
  },

  async prepareExecuteTransaction(request: ExecuteRequest): Promise<PreparedTransaction> {
    const response = await fetch(`${API_BASE_URL}/proposals/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to prepare execute transaction' }));
      throw new Error(error.message || 'Failed to prepare execute transaction');
    }

    return response.json();
  },

  async prepareCancelTransaction(request: CancelRequest): Promise<PreparedTransaction> {
    const response = await fetch(`${API_BASE_URL}/proposals/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to prepare cancel transaction' }));
      throw new Error(error.message || 'Failed to prepare cancel transaction');
    }

    return response.json();
  },
};
