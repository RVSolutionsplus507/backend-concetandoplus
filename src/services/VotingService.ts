// Servicio para lógica de votación
export class VotingService {
  // Calcula aprobaciones requeridas (mayoría)
  calculateRequiredApprovals(totalPlayers: number): number {
    const totalVoters = totalPlayers - 1;
    return Math.ceil(totalVoters / 2);
  }

  // Verifica si todos votaron
  hasAllVoted(votesReceived: number, expectedVoters: number): boolean {
    return votesReceived >= expectedVoters;
  }

  // Determina si hay desacuerdos que activen debate
  shouldTriggerDebate(votes: Map<string, 'agree' | 'disagree'>): boolean {
    return Array.from(votes.values()).some(v => v === 'disagree');
  }

  // Cuenta votos de acuerdo y desacuerdo
  countVotes(votes: Map<string, 'agree' | 'disagree'>): { approved: number; disagreed: number } {
    const votesArray = Array.from(votes.values());
    return {
      approved: votesArray.filter(v => v === 'agree').length,
      disagreed: votesArray.filter(v => v === 'disagree').length
    };
  }

  // Verifica si la votación fue aprobada
  isVotingApproved(approvedVotes: number, requiredApprovals: number): boolean {
    return approvedVotes >= requiredApprovals;
  }
}

export const votingService = new VotingService();
