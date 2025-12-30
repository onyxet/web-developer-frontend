import { ProposalState } from '../../services/api'

interface StateLabelProps {
  state: ProposalState
  className?: string
}

const STATE_LABELS: Record<ProposalState, string> = {
  [ProposalState.Pending]: 'Pending',
  [ProposalState.Active]: 'Active',
  [ProposalState.Canceled]: 'Canceled',
  [ProposalState.Defeated]: 'Defeated',
  [ProposalState.Succeeded]: 'Succeeded',
  [ProposalState.Queued]: 'Queued',
  [ProposalState.Expired]: 'Expired',
  [ProposalState.Executed]: 'Executed'
}

const STATE_CLASS_NAMES: Record<ProposalState, string> = {
  [ProposalState.Pending]: 'state-pending',
  [ProposalState.Active]: 'state-active',
  [ProposalState.Canceled]: 'state-canceled',
  [ProposalState.Defeated]: 'state-defeated',
  [ProposalState.Succeeded]: 'state-succeeded',
  [ProposalState.Queued]: 'state-queued',
  [ProposalState.Expired]: 'state-expired',
  [ProposalState.Executed]: 'state-executed'
}

export function StateLabel({ state, className = '' }: StateLabelProps) {
  const stateClass = STATE_CLASS_NAMES[state] || 'state-pending'
  const stateLabel = STATE_LABELS[state] || 'Unknown'

  return (
    <span className={`proposal-status ${stateClass} ${className}`.trim()}>
      {stateLabel}
    </span>
  )
}

export default StateLabel
