<script lang="ts">
  import "../../../demo/app.scss";
  let { children } = $props();
</script>

<svelte:head>
  <title>SnapEngineJS</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<nav class="nav-bar">
  <div class="nav-left">
    <a href="/" class="wordmark">SnapEngine</a>
  </div>
  <div class="nav-right">
    <a href="#assets" class="nav-link">Assets</a>
    <a href="/docs" class="nav-link">Docs</a>
    <a href="https://github.com/tfukaza/SnapLineJS" class="nav-link github-link" target="_blank" rel="noopener noreferrer">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      <!-- <span>GitHub</span> -->
    </a>
  </div>
</nav>
{@render children()}

<footer>
  <div class="app-footer">
    <div class="footer-content">
      <div class="footer-brand">
        <span class="brand-name">SnapEngine</span>
        <span class="copyright">© {new Date().getFullYear()}</span>
      </div>
      <div class="footer-sections">
        <div class="footer-column">
          <h4>Project</h4>
          <a href="/doc">Docs</a>
          <a href="https://github.com/tfukaza/SnapLineJS" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <div class="footer-column">
          <a href="/#assets"><h4>Assets</h4></a>
          <span class="footer-link-disabled">SnapZap</span>
          <a href="/dropandsnap">DropAndSnap</a>
          <span class="footer-link-disabled">SnapLine</span>
        </div>
      </div>
    </div>
</div>
</footer>

<style lang="scss">
  .nav-bar {
    display: flex;
    justify-content: space-between;
    gap: var(--size-64);
    align-items: center;
    padding: 1rem 0;
    top: 0;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 0 0 var(--size-8) var(--size-8);
    width: clamp(100px, 90%, 1200px);
    box-sizing: border-box;
    margin: 0px auto;

    @media (max-width: 720px) {
      // padding: 1rem;
      gap: var(--size-32);
    }
  }

  .nav-left {
    display: flex;
    align-items: center;

    a {
      font-size: 32px;
      font-weight: 400;
      font-family: 'Handjet', sans-serif;
    }
  }

  .wordmark {
    font-size: 1.25rem;
    font-weight: 700;
    color: #3a2a22;
    text-decoration: none;
    letter-spacing: -0.02em;

    &:hover {
      color: var(--color-primary);
    }
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    font-size: 0.9rem;
    font-weight: 500;
    color: #5e4d44;
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-primary);
    }
  }

  .github-link {
    display: flex;
    align-items: center;
    gap: 0.4rem;

    svg {
      transition: transform 0.2s ease;
    }

    &:hover svg {
      transform: scale(1.1);
    }
  }

  footer {
      border-top: 1px solid rgba(0,0,0,0.05);
      width: 100%;
  }
  .app-footer {
    margin-top: auto;
    width: clamp(100px, 90%, 1200px);
    margin: var(--size-128) auto;
    box-sizing: border-box;
    background: white;
    
    .footer-content {
      max-width: var(--page-width, 1400px);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      @media (max-width: 720px) {
        flex-direction: column;
        gap: 2rem;
      }
    }

    .footer-brand {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.9rem;
      color: #8b8a89;
      font-family: 'Tomorrow', sans-serif;
      
      .brand-name {
        color: #3a2a22;
        font-weight: 500;
      }
    }

    .footer-sections {
      display: flex;
      gap: 4rem;
    }

    .footer-column {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      h4 {
        margin: 0;
      }

      a {
        text-decoration: none;
        font-size: 0.9rem;
        transition: color 0.2s ease;
        
        &:hover {
          color: var(--color-primary);
        }
      }

      .footer-link-disabled {
        font-size: 0.9rem;
        color: #a8a4a2;
        cursor: default;
      }
    }
  }
</style>
