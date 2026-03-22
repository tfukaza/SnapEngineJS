<section class="about-section">
  <div class="about-container">

# SnapEngine - An Engine for Building Interactive UI

---

## Why SnapEngine?
It may surprise you that, even today, implementing interactive UI is still very difficult.
<br>

**Frontend frameworks** like React or Vue are good at updating the _content_ of a website in real time, but the same cannot be said for changing the _layout_. 
Take a typical social media site for example; content like posts and comments changes rapidly, but the layout of the website otherwise remains the same. 
<br>

Meanwhile, **canvas/WebGL**-based frameworks like Three.js and Pixi.js provide excellent performance, but because they no longer use the DOM, everything has to be absolutely positioned on screen manually. This makes it harder to build structured UI, and also loses access to the  ecosystem built around DOM, such as accessibility tools and SEO optimizations.
<br>

Another route is to use a dedicated library that provides the necessary UI components. 
This approach is practical for most cases, but it's not without its tradeoffs.
Often, these libraries only work for specific frontend frameworks.
There is also the issue of compatibility—if you ever need to mix and match multiple libraries, there is no guarantee they will work together.
<br>

There is of course the option to code it yourself, or maybe even vibe code it.
But highly interactive UI requires precise coordination of 
input handling, DOM updates, UI logic and animations, which 
is a difficult task that even latest AI models struggle to perfect.


## Idea: A Common Foundation for Interactivity

The inspiration came from the video game industry. 
Game developers rarely develop a game from scratch.
More likely, they use a game engine like Unity or Unreal Engine, which provides
common utilities like physics, hardware optimizations, controller input, etc.

SnapEngine applies that same idea to the web. It is designed to be:
- Optimized for the DOM, while providing reasonable performance when mutating and moving elements dynamically.
- Framework agnostic.
- Pre-packaged with utilities like collision detection, gesture handling, etc.

<br>

On top of that foundation, SnapEngine exposes a set of standardized APIs that make it possible to build reusable interactive UI elements as _assets_.
Because these assets share a common engine, they are easier to combine, maintain, and extend.
<br>

That is the idea behind SnapEngine, the web's _interactivity engine_ designed for building highly interactive DOM based user interfaces, with a focus on performance, extensibility, and composability.

  </div>
</section>

<style lang="scss">
  hr {
    margin: 2rem 0;
    border: none;
    border-top: 2px solid var(--color-background-tint);
  }

  .about-section {
    min-height: 80vh;
    padding: 4rem 0;

    h1 {
      text-align: center;
      line-height: 0.8;
      margin-bottom: 2rem;
    }

    h2 {
      font-size: 2rem;
      margin-top: 3rem;
      margin-bottom: 1rem;
    }
  }

  .about-container {
    width: clamp(100px, 90%, 600px);
    margin: 0 auto;
  }
</style>