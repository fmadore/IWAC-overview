import App from "./App.svelte";
import './styles/main.css'; // Import the new CSS architecture
import './theme.css'; // Keep for backward compatibility during transition

// Initialize the app
const app = new App({
  target: document.getElementById("app") as HTMLElement,
});

export default app;
