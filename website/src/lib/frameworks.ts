export const frameworks = ["svelte", "react", "vanilla"] as const;

export type Framework = (typeof frameworks)[number];

export const frameworkLabels: Record<Framework, string> = {
  svelte: "Svelte",
  react: "React",
  vanilla: "Vanilla JS",
};

export const isFramework = (value: string | null): value is Framework =>
  frameworks.includes(value?.toLowerCase() as Framework);
