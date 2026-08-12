import { readFile } from "node:fs/promises";
import type { ProfileConfig } from "./types.js";

const requiredStrings = ["githubAccount", "gitEmail"] as const;

export async function loadConfig(path: string): Promise<ProfileConfig> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Profile configuration must be a JSON object.");
  }

  const config = parsed as Record<string, unknown>;
  if (config.profile !== "personal" && config.profile !== "work") {
    throw new Error("profile must be personal or work.");
  }
  for (const key of requiredStrings) {
    if (typeof config[key] !== "string" || config[key].length === 0) {
      throw new Error(`${key} must be a non-empty string.`);
    }
  }
  if (!Array.isArray(config.repositoryRoots) || !config.repositoryRoots.every((value) => typeof value === "string")) {
    throw new Error("repositoryRoots must be an array of paths.");
  }
  if (!Array.isArray(config.repositoryAllowlist) || !config.repositoryAllowlist.every((value) => typeof value === "string")) {
    throw new Error("repositoryAllowlist must be an array of owner/name values.");
  }
  if (!config.candidateBranches || typeof config.candidateBranches !== "object" || Array.isArray(config.candidateBranches)) {
    throw new Error("candidateBranches must be an object keyed by owner/name.");
  }
  if (!config.verificationCommands || typeof config.verificationCommands !== "object" || Array.isArray(config.verificationCommands)) {
    throw new Error("verificationCommands must be an object keyed by owner/name.");
  }
  if (!["merge", "squash", "rebase"].includes(String(config.mergeMethod))) {
    throw new Error("mergeMethod must be merge, squash, or rebase.");
  }
  if (typeof config.riskThreshold !== "number" || config.riskThreshold < 0 || config.riskThreshold > 100) {
    throw new Error("riskThreshold must be between 0 and 100.");
  }

  const booleans = ["autoOpenPullRequests", "autoMergeLowRisk", "requireMergeApproval", "requireReview"] as const;
  for (const key of booleans) {
    if (typeof config[key] !== "boolean") throw new Error(`${key} must be boolean.`);
  }
  if (config.profile === "work" && config.requireMergeApproval !== true) {
    throw new Error("Work profiles must require explicit merge approval.");
  }

  return config as unknown as ProfileConfig;
}
