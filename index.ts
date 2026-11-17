// The background location task must be registered before the app renders,
// so Android can run it even when the app was closed.
import "./src/tracking/task";
import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
