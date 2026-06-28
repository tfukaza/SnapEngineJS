import { error, redirect } from "@sveltejs/kit";

type DocEntry = {
  slug: string;
  title: string;
  order: number;
  project: string;
  projectTitle: string;
  section: string;
  sectionTitle: string;
  sectionOrder: number;
};

type DocSection = {
  name: string;
  title: string;
  order: number;
  project: string;
  projectTitle: string;
  entries: DocEntry[];
};

const formatTitle = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");

const projectTitles: Record<string, string> = {
  snapengine: "SnapEngine",
  snapsort: "SnapSort",
};

export const entries = (): DocEntry[] => {
  // Use the alias to find files (eager: true to access metadata)
  const modules = import.meta.glob("@docs/**/*.{md,mdx}", {
    eager: true,
  }) as Record<
    string,
    {
      metadata?: {
        title?: string;
        order?: number;
        project?: string;
        projectTitle?: string;
        section?: string;
        sectionTitle?: string;
        sectionOrder?: number;
        hidden?: boolean;
      };
    }
  >;
  const entries: DocEntry[] = [];
  for (const [path, module] of Object.entries(modules)) {
    // Revised regex to match docs/ root structure
    const match = path.match(/docs\/(.*)\.(md|mdx)$/);
    if (match) {
      let slug = match[1];
      // Derive section from original path BEFORE modifying slug
      // e.g., "snapengine/introduction/index" -> project "snapengine", section "introduction"
      const originalParts = slug.split("/");
      const derivedProject = originalParts.length > 1 ? originalParts[0] : "";
      const derivedSection =
        originalParts.length > 2 ? originalParts[1] : derivedProject;

      // Now modify slug for routing
      if (slug.endsWith("/index")) {
        slug = slug.replace(/\/index$/, "");
      } else if (slug === "index") {
        continue;
      }
      const metadata = module.metadata || {};
      if (metadata.hidden) {
        continue;
      }

      const project = metadata.project ?? derivedProject;
      const projectTitle =
        metadata.projectTitle ??
        metadata.sectionTitle ??
        projectTitles[project] ??
        (project ? formatTitle(project) : "Docs");
      const section = metadata.section ?? derivedSection;

      entries.push({
        slug,
        title: metadata.title || slug || "Home",
        order: metadata.order ?? 999,
        project,
        projectTitle,
        section,
        sectionTitle:
          metadata.sectionTitle ??
          (section === project
            ? projectTitle
            : section
              ? formatTitle(section)
              : "Getting Started"),
        sectionOrder: metadata.sectionOrder ?? (derivedSection ? 999 : 0),
      });
    }
  }
  // Sort by project, then sectionOrder, then section name, then order, then title
  return entries.sort(
    (a, b) =>
      a.project.localeCompare(b.project) ||
      a.sectionOrder - b.sectionOrder ||
      a.section.localeCompare(b.section) ||
      a.order - b.order ||
      a.title.localeCompare(b.title),
  );
};

export const _getGroupedEntries = (): DocSection[] => {
  const allEntries = entries();
  const sections: Map<string, DocSection> = new Map();

  for (const entry of allEntries) {
    const sectionKey = `${entry.project}:${entry.section}`;
    if (!sections.has(sectionKey)) {
      sections.set(sectionKey, {
        name: entry.section,
        title: entry.sectionTitle,
        order: entry.sectionOrder,
        project: entry.project,
        projectTitle: entry.projectTitle,
        entries: [],
      });
    }
    sections.get(sectionKey)!.entries.push(entry);
  }

  return Array.from(sections.values()).sort(
    (a, b) =>
      a.project.localeCompare(b.project) ||
      a.order - b.order ||
      a.name.localeCompare(b.name),
  );
};

export async function load({ params }) {
  const modules = import.meta.glob("@docs/**/*.{md,mdx}");

  const slug = params.slug || "";
  if (slug === "") {
    throw redirect(308, "/docs/snapengine/introduction");
  }

  if (slug === "snapengine") {
    throw redirect(308, "/docs/snapengine/introduction");
  }

  if (slug === "snapsort") {
    throw redirect(308, "/docs/snapsort/introduction");
  }

  for (const [path, resolver] of Object.entries(modules)) {
    // Parse based on docs root
    const relMatch = path.match(/docs\/(.*)\.(md|mdx)$/);
    if (relMatch) {
      let pathSlug = relMatch[1];
      if (pathSlug === "index") {
        if (slug === "index") {
          const mdx: any = await resolver();
          return {
            component: mdx.default,
            metadata: mdx.metadata,
          };
        }
      } else {
        // For non-root files
        if (pathSlug.endsWith("/index")) {
          pathSlug = pathSlug.slice(0, -6); // remove '/index'
        }

        if (pathSlug === slug && slug !== "index") {
          const mdx: any = await resolver();
          return {
            component: mdx.default,
            metadata: mdx.metadata,
          };
        }
      }
    }
  }

  throw error(404, `Docs page not found: ${slug}`);
}
