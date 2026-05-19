import type { RunActivity } from "../domain/types.js";

export interface CorosProvider {
  getRecentRuns(userId: string, days: number): Promise<RunActivity[]>;
}

export class FixtureCorosProvider implements CorosProvider {
  constructor(private readonly runs: RunActivity[]) {}

  async getRecentRuns(_userId: string, days: number): Promise<RunActivity[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.runs.filter((run) => new Date(run.startedAt).getTime() >= cutoff);
  }
}
