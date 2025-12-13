<script lang="ts">
  import Select from "./../../../../../svelte/src/lib/node_ui/Select.svelte";
  // import Background from "./../../../../../svelte/src/lib/canvas/Background.svelte";
  import { NodeComponent, Engine } from "../../../../../../src/index";
  import Math from "./Math.svelte";
  import Print from "./Print.svelte";
  import TextBox from "./TextBox.svelte";
  import { onMount, getContext } from "svelte";
  import type { ObjectData } from "./../../../../../svelte/src/lib/engine.svelte";
  import { CameraControl } from "./../../../../../../src/asset/cameraControl";

  let engine: Engine = getContext("engine");

  const textBox1 = new NodeComponent(engine, null);
  const textBox2 = new NodeComponent(engine, null);
  const textBox3 = new NodeComponent(engine, null);
  const math1 = new NodeComponent(engine, null);
  const print = new NodeComponent(engine, null);


  let objects: ObjectData[] = $state([
    {
      svelteComponent: TextBox,
      object: textBox1,
      prop: { text: "7" }
    },
    {
      svelteComponent: TextBox,
      object: textBox2,
      prop: { text: "11" }
    },
    {
      svelteComponent: TextBox,
      object: textBox3,
      prop: { text: "Hello World" }
    },
    {
      svelteComponent: Math,
      object: math1
    },
    {
      svelteComponent: Print,
      object: print
    },
  ]);
  let cameraControl: CameraControl = getContext("cameraControl");

  onMount(() => {
    textBox1.worldPosition = [-350, -240];
    textBox2.worldPosition = [-350, -150];
    textBox3.worldPosition = [-54, 192];

    math1.worldPosition = [-30, -250];
    
    print.worldPosition = [224, 12];

    textBox1.getConnector("text")!.connectToConnector(
      math1.getConnector("input-0")!, null
    );
    textBox2.getConnector("text")!.connectToConnector(
      math1.getConnector("input-1")!, null
    );
    
    math1.getConnector("output")!.connectToConnector(
      print.getConnector("font-size")!, null
    );
    textBox3.getConnector("text")!.connectToConnector(
      print.getConnector("text")!, null
    );

    textBox1.writeTransform();
    textBox2.writeTransform();
    textBox3.writeTransform();
    math1.writeTransform();
    print.writeTransform();

    textBox1.propagateProp()
    textBox2.propagateProp();
    textBox3.propagateProp();

    cameraControl.queueUpdate("WRITE_2").addCallback(() => {
      const cameraStart = cameraControl.getCameraCenterPosition();
      const cameraTarget = { x: 0, y: 0 };
      // Animation logic removed as animate method is not available on CameraControl
      // Directly setting the camera position instead
      cameraControl.updateCameraCenterPosition(cameraTarget.x, cameraTarget.y);
    });
  });
</script>

<!-- <Background /> -->
<Select />
{#each objects as object}
  <object.svelteComponent nodeObject={object.object} {...object.prop} />
{/each}

<style lang="scss">
</style>
