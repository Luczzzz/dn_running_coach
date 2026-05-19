export type AppConfig = {
  dataDir: string;
  databasePath: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataDir = env.RUNNING_COACH_DATA_DIR ?? "/data/running-coach";
  return {
    dataDir,
    databasePath: env.RUNNING_COACH_DB ?? `${dataDir}/events/running-coach.sqlite`
  };
}
