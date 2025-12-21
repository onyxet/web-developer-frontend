// DAO Contract Configuration
export const DAO_CONTRACT_ADDRESS = import.meta.env.VITE_DAO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'

export const DAO_ABI = [
  // createProposal function (onlyOwner)
  'function createProposal(string memory _description) public returns (tuple(uint256 id, string description, bool executed))',

  // executeProposal function (onlyOwner)
  'function executeProposal(uint256 _id) public',

  // getProposal function
  'function getProposal(uint256 _id) public view returns (tuple(uint256 id, string description, bool executed))',

  // proposalCount variable
  'function proposalCount() public view returns (uint256)',

  // owner function (from Ownable)
  'function owner() public view returns (address)',

  // Events
  'event ProposalCreated(uint256 id, address creator, string description)',
  'event ProposalExecuted(uint256 id, address executor)'
] as const

export interface Proposal {
  id: bigint
  description: string
  executed: boolean
}

export interface ProposalCreatedEvent {
  id: bigint
  creator: string
  description: string
}

export interface ProposalExecutedEvent {
  id: bigint
  executor: string
}
