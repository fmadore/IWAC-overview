import App from "./App.svelte";
import './styles/main.css'; // Import the new CSS architecture
// The old CSS files (theme.css and app.css) have been phased out in favor of the new CSS architecture

// Initialize the app
const app = new App({
  target: document.getElementById("app") as HTMLElement,
});

export default app;
