import "../../css/snapdesign.scss";
import "../../website/src/lib/landing/style-guide/style.dev.scss";
import App from "./src/App.svelte";
import { mount } from "svelte";

const app = mount(App, {
  target: document.body,
});

export default app;
