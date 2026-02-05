<script lang="ts">
</script>

<section class="about-section">
  <div class="about-container">
    <h1>Welcome to SnapEngine</h1>
    <p>SnapEngine is an <i>interactivity engine</i>. What is an interactivity engine? To understand that, we first need to understand the current state of the web and its problems.</p>
    
    <hr />

    <h2>The Web Today</h2>
    <p>Websites today are dynamic, and the way they appear on screens can change real time.
      Web developers often build these websites on the concept of <i>reactivity</i>, where the website is a visual representation of an underlying data.
      As users interact with the website through forms, buttons, dropdowns, etc., the data is updated and reflected to the website. 
      Many popular frameworks implement this concept, such as React, Vue, and Svelte. However, these frameworks are still designed around the assumption that the website is nonetheless mostly stationary.
      Imagine your typical social media feed for example. You see the counter go up when you click the "Like" button, and the comment section fill up as 
      users post their thoughts, but otherwise the overall layout of the website remains mostly the same.</p> 
    <br />
    <p>The web today is more than that though. And we're not talking about the impressive <a href="https://madebyevan.com/webgl-water/">WebGL</a> or <a href="https://sandspiel.club/">WASM</a> demonstrations,
    but rather the often overlooked middle ground - the user interfaces that are still built using traditional web technologies, but provide a higher degree of interactivity, like drag-and-drop able kanban boards
    or reorder-able lists. These are prevalent in web apps like Zapier and Notion, but also probably exists more subtly in the apps and websites you use everyday.
    It may even be safe to say they are <i>ubiquitous</i>, it's just that we own don't think about them as much.</p>
    <br />
    
    <h2>Challenges in the Current Ecosystem</h2>
    <p>So it may surprise you that as of today, the ecosystem for implementing these types of interfaces is very limiting, at least in my opinion. 
      And that's not because of a lack of high quality libraries - in fact there are many great libraries out there for implementing interactive interfaces.
      The greater issue is that these libraries are often very specialized for a specific functionality, such as draggable elements or touch gesture handling.</p>
    <br />
    <p>This creates several issues:</p>
    <ul>
      <li>Complex interfaces require stitching together multiple libraries, which can lead to compatibility issues and increased bundle size.</li>
      <li>Maintainability can be a concern since some libraries may not be actively maintained or may have conflicting dependencies.</li>
      <li>Integration with frontend frameworks can be a challenge if the libraries support different frameworks.</li>
    </ul>

    <h2>Idea: A Common Foundation for Interactivity</h2>
    <p>
    The inspiration comes from video game developers. These days, it is rare for game developers to build games from scratch by handling physics engines, hardware optimizations, controller input, etc. all by themselves.
    More likely, they use a game engine such as Unity or Unreal Engine as a one stop shop that provides these foundations. 
    The engine also is platform agnostic, allowing developers to build games that can run on multiple platforms with minimal changes.
    </p>
    <br/>
    <p>
    What if we had something similar for building web applications? A common foundation that provides the building blocks for interactivity, like collision engine, DOM update optimizations, gesture input, etc. 
    An engine that is agnostic to frontend frameworks. An engine not for games but for interactive web apps, an <i>interactivity engine.</i> 
    </p>
    <br/>
    <p>Continuing the game engine analogy, we can provide common interactive UI elements as <i>assets</i>. 
    These assets can be anything from draggable lists to kanban boards, but are all built on top of the same interactivity engine.
    This way, we can create a wide variety of interactive experiences that are all compatible and relatively maintainable.</p>

    <h2>Introducing SnapEngine</h2>
    <p>These are the ideas behind SnapEngine. SnapEngine is an interactivity engine for building interactive web applications.</p>
    <br />
    <p>Ready to get started? <a href="/docs">Check out the documentation</a> or <a href="/">see it in action</a>.</p>


    <hr/>
    <p>
      Disclaimer: The examples and links provided in this page are for demonstration purposes only and do not imply endorsement of any specific product or service.
    </p>


    


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
