import { mount } from 'svelte'
import App from "./App.svelte";
import './styles/index.css'; // Import the clean CSS architecture
// The old CSS files (theme.css and app.css) have been phased out in favor of the new CSS architecture

// Initialize the app
mount(App, {
  target: document.getElementById("app") as HTMLElement,
});

// export default app; // No longer needed with mount
