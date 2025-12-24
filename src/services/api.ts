const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL;

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

export const proposalsAPI = {
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
};
