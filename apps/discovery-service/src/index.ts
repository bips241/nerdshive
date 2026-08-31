/**
 * Discovery Microservice Core Domain (apps/discovery-service)
 */

import { RedisEventBus } from '../../../libs/events';

export interface TeammateCandidate {
  userId: string;
  username: string;
  skills: string[];
}

export class DiscoveryService {
  constructor(private readonly eventBus: RedisEventBus) {}

  public async findComplementaryTeammates(
    userSkills: string[],
    requiredSkills: string[]
  ): Promise<Array<{ userId: string; username: string; matchingSkills: string[]; score: number }>> {
    const userSkillSet = new Set(userSkills.map((s) => s.toLowerCase()));
    const missingSkills = requiredSkills.filter((s) => !userSkillSet.has(s.toLowerCase()));

    const mockCandidates: TeammateCandidate[] = [
      { userId: 'cand_1', username: 'rust_ace', skills: ['Rust', 'WebAssembly', 'Docker'] },
      { userId: 'cand_2', username: 'devops_ninja', skills: ['Kubernetes', 'AWS', 'Terraform', 'Docker'] },
      { userId: 'cand_3', username: 'frontend_wizard', skills: ['Next.js', 'React', 'Tailwind', 'GraphQL'] },
      { userId: 'cand_4', username: 'backend_guru', skills: ['Go', 'gRPC', 'PostgreSQL', 'Redis'] },
    ];

    const results = mockCandidates.map((candidate) => {
      const candidateSkillSet = new Set(candidate.skills.map((s) => s.toLowerCase()));
      const matchingSkills = missingSkills.filter((s) => candidateSkillSet.has(s.toLowerCase()));
      const score = missingSkills.length > 0 ? matchingSkills.length / missingSkills.length : 0.5;

      return {
        userId: candidate.userId,
        username: candidate.username,
        matchingSkills,
        score: Number(score.toFixed(2)),
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }
}
