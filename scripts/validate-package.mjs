import { access, readFile } from "node:fs/promises";

const required = [
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "plugins/merge-warden/.codex-plugin/plugin.json",
  "plugins/merge-warden/.claude-plugin/plugin.json",
  "plugins/merge-warden/skills/merge-warden/SKILL.md"
];

for (const path of required) await access(path);
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const codexPlugin = JSON.parse(await readFile("plugins/merge-warden/.codex-plugin/plugin.json", "utf8"));
const claudePlugin = JSON.parse(await readFile("plugins/merge-warden/.claude-plugin/plugin.json", "utf8"));
const skill = await readFile("plugins/merge-warden/skills/merge-warden/SKILL.md", "utf8");
const cli = await readFile("src/cli.ts", "utf8");
if (packageJson.version !== codexPlugin.version || packageJson.version !== claudePlugin.version) throw new Error("Package and plugin versions differ.");
if (packageJson.bin?.mergewarden !== "dist/src/cli.js") throw new Error("CLI binary path is invalid.");
if (!skill.startsWith("---\nname: merge-warden\n")) throw new Error("Skill frontmatter is invalid.");
if (skill.includes("TODO")) throw new Error("Skill contains a TODO placeholder.");
if (!cli.includes(`const VERSION = "${packageJson.version}"`)) throw new Error("CLI and package versions differ.");
process.stdout.write("MergeWarden package validation passed.\n");
