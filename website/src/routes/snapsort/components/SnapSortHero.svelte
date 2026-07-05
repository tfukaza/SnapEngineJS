<script lang="ts">
  import { Engine } from "@snap-engine/asset-base-svelte";
  import type { Engine as SnapEngine } from "@snap-engine/core";
  import { Container, Handle, Item } from "@snap-engine/snapsort-svelte";
  import SnapSortContextBoundary from "../SnapSortContextBoundary.svelte";

  let {
    debugLayout,
    engine = $bindable<SnapEngine | null>(null),
  }: {
    debugLayout: boolean;
    engine?: SnapEngine | null;
  } = $props();

  function goToDocs() {
    window.location.href = "/docs/snapsort/introduction";
  }

  function goToGallery() {
    window.location.href = "/snapsort/gallery";
  }

  const title = "SnapSort";
  const gripDots = Array.from({ length: 6 }, (_, i) => i);
  const titleChars = title.split("").map((char, i) => ({
    char,
    id: `snapsort-letter-${i}`,
  }));
</script>

<section id="landing">
  <Engine id="snapsort-canvas" bind:engine debug={debugLayout}>
    <div class="hero-section">
      <div class="hero-frame">
        <div class="hero-slot slot">
          <Container
            className="hero-stack"
            config={{ direction: "column", groupID: "snapsort-hero-content" }}
          >
            <Item className="hero-stack-item hero-title-item">
              <div class="hero-row card">
                <Handle className="hero-row-handle">
                  <span class="hero-row-grip" aria-hidden="true">
                    {#each gripDots as dot (dot)}
                      <i></i>
                    {/each}
                  </span>
                </Handle>
                <div class="title-section" aria-label="SnapSort">
                  <SnapSortContextBoundary>
                    <Container config={{ direction: "row", groupID: "snapsort-title" }}>
                      {#each titleChars as { char, id } (id)}
                        <Item style="padding: 0; width: auto;">
                          <span {id} class="letter-shell">
                            <span class="title-glyph title-text pixel-font">
                              {char === " " ? "\u00A0" : char}
                            </span>
                            <span class="letter-grip" aria-hidden="true">
                              {#each gripDots as dot (dot)}
                                <i class="letter-grip-dot"></i>
                              {/each}
                            </span>
                          </span>
                        </Item>
                      {/each}
                    </Container>
                  </SnapSortContextBoundary>
                </div>
              </div>
            </Item>

            <Item className="hero-stack-item hero-copy-item">
              <div class="hero-row card">
                <Handle className="hero-row-handle">
                  <span class="hero-row-grip" aria-hidden="true">
                    {#each gripDots as dot (dot)}
                      <i></i>
                    {/each}
                  </span>
                </Handle>
                <p class="hero-statement large">
                  Component library for drag and drop UI. Open source and framework agnostic.
                </p>
              </div>
            </Item>

            <Item className="hero-stack-item hero-cta-item">
              <div class="hero-row hero-row-final card">
                <Handle className="hero-row-handle">
                  <span class="hero-row-grip" aria-hidden="true">
                    {#each gripDots as dot (dot)}
                      <i></i>
                    {/each}
                  </span>
                </Handle>
                <div class="hero-cta">
                  <button class="primary" type="button" onclick={goToDocs}>Get Started</button>
                  <button type="button" onclick={goToGallery}>Gallery</button>
                </div>
              </div>
            </Item>
          </Container>
        </div>
      </div>
    </div>
  </Engine>

</section>
