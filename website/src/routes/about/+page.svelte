<script lang="ts">
</script>

<section class="about-section">
  <div class="about-container">
    <h1>What is SnapEngine?</h1>
    
    <hr />

    <h2>The Web Today</h2>
    <p>
      Websites today are complex applications that can provide a wide range of user interfaces.
      From drag-and-drop TODO lists to kanban board project management tools, the web has evolved to support a much more dynamic and interactive experience than the static pages of the past.
      So it may surprise you that today, implementing these types of interfaces is still a very difficult task.
    </p>
    <br />
    <p>
      The first thought for many may be to use a <b>frontend framework</b> like React or Vue, but these frameworks are 
      still designed for websites where the overall layout and structure is mostly stationary. 
      While it is technically possible to implement dynamic interfaces with these frameworks, 
      they are not fundamentally designed for these type of interactions where elements are constantly moving around and changing their position on the page,
      leading to performance issues unless properly optimized by hand.
    </p>
    <br />
    <p>
      At the other end of the spectrum are <b>canvas/WebGL</b> based libraries and frameworks like Three.js and Pixi.js, which render everything as pixels. 
      These provide excellent performance, but because they no longer use the DOM, comes with its own set of challenges. 
    </p>
    <ul>
      <li>Everything has to be positioned on screen manually. Even with the aid of some UI libraries built for these frameworks, it can be difficult to fine tune the exact layout and aesthetics.</li>
      <li>They they do not have access to the rich ecosystem designed for the DOM, such as accessibility tools and SEO optimizations</li>
    </ul>
    <br />
    <p>
      Of course there is also the option of simply using a library that provide the interactive UI you need.
      This is perhaps the most common approach, a seen in cases like Zapier using <a href="https://reactflow.dev/">React Flow</a> for their workflow builder.
      Admittedly this approach is likely the most practical for most cases, but it's not without issues. 
      Namely, if the library does not provide the exact functionality you need, you are at the mercy of the library's maintainers to add it, or you have to fork the library and maintain your own version.
      There is also the issue of compatibility - many libraries are specific to certain frontend frameworks.
    </p> 
    <br />
    <p>A more DIY approach is to implement everything from scratch by combing more low-level libraries for things like gesture handling, collision detection, etc. 
      This is a very flexible approach, but it can be very time consuming and difficult to maintain. Not to mention, these libraries may not be 
      fully compatible with each other, and be difficult to optimize or customize.
    </p>
    <br />
    <p>
      Last but not least, as many of you have probably wondered by now, why not just vibe code it? 
      While AI certainly can get you halfway there very quickly, it still frequently struggles with interfaces that require careful coordination of inputs, animations, DOM updates, etc.
    </p>


    <h2>Idea: A Common Foundation for Interactivity</h2>
    <p>
      The inspiration for a solution came from the video game industry. These days, it is rare for game developers to build from scratch by handling physics, hardware optimizations, controller input, etc. all by themselves.
      More likely, they use a game engine like Unity or Unreal Engine as a one stop shop that provides these foundations.
    </p>
    <br/>
    <p>
      The idea then was to create something similar for the web. 
      This engine will be framework agnostic, giving developers more choice. 
      It is fully optimized for the DOM, and comes prep-packaged with utilities like collision detection, gesture handling, etc. 
      The engine exposes a set of well defined APIs for these utilities, on top of which we can build various interactive UI elements as <i>assets</i>.
      Because they all run on the same underlying engine, they will be highly compatible with one another, and also eases code maintenance by sharing a common infrastructure.
      And if developers want to build their own custom assets or modify existing ones, the engine's standardized API makes it relatively easy to do so.
    </p>
    <br/>
    <p>
      Hence, SnapEngine was born. It is the web's <i>interactivity engine</i> designed for building highly interactive user interfaces in the DOM, with a focus on performance, flexibility, and ease of use.
    </p>

  <h2>Welcome to SnapEngine</h2>
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
