// @ts-nocheck

const frameworkIdentity = (node) => {
  const match = node.meta?.match(
    /(?:^|\s)framework=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i,
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
};

const wrapFrameworkCodeBlocks = (node) => {
  if (!node.children) return;

  node.children = node.children.flatMap((child) => {
    wrapFrameworkCodeBlocks(child);

    if (child.type !== 'code') return child;

    const framework = frameworkIdentity(child);
    if (!framework) return child;

    return [
      {
        type: 'html',
        value: `<div class="framework-code-block" data-framework="${framework.toLowerCase()}">`
      },
      child,
      { type: 'html', value: '</div>' }
    ];
  });
};

export function remarkFrameworkCodeBlocks() {
  return wrapFrameworkCodeBlocks;
}
