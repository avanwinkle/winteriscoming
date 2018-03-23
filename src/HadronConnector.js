import { Component } from "react";
import HadronWindow from "./HadronWindow";

const USE_IFRAME = false;
const TARGET_WINDOWS = ["blue", "red"];

class HadronConnector extends Component {
  
  constructor(props) {
    super(props);
    this._useIframe = USE_IFRAME;
    this.connectionStates = {};
    this._targetWindows = {};

    TARGET_WINDOWS.forEach((univ) => {
      this.connectionStates[univ] = "NOT_CONNECTED";
      this._targetWindows[univ] = new HadronWindow(univ, USE_IFRAME);
      this._targetWindows[univ].onSceneComplete(this._onSceneChange.bind(this));
    });
    this._currentTarget = this._targetWindows[TARGET_WINDOWS[0]];
  }

  loadSceneToTargetWindow(scene, target) {
    var targetWindow;

    // If any target window already has this scene, use it
    TARGET_WINDOWS.forEach((univ) => {
      if (this._targetWindows[univ].loadedScene === scene) {
        console.log(" - Scene '" + scene.description + "' already loaded in target " + univ);
        return this._targetWindows[univ];
      }
    });

    // If no target window has this scene, find one
    if (!targetWindow) {
      switch (target) {
      case "current":
        targetWindow = this.targetWindow();
        break;
      case "next":
        targetWindow = this.targetWindow(true);
        break;
      default:
        if (TARGET_WINDOWS.indexOf(target) !== -1) {
          targetWindow = this._targetWindows[target];
        } else {
          targetWindow = this.targetWindow(true);
        }
      }
    }

    if (targetWindow) {
      targetWindow.loadScene(scene);
    } else {
      console.warn("Unable to get target window '" + target + "' for scene");
    }

    return targetWindow;
  }

  seek(seektime) {
    this.targetWindow().seek(seektime);
  }

  targetWindow(getAvailable) {
    var target;
    if (getAvailable) {
      TARGET_WINDOWS.forEach((univ) => {
        if (this._targetWindows[univ] !== this._currentTarget) {
          target = this._targetWindows[univ];
        }
      });
    } else {
      target = this._currentTarget;
    }
    return target;
  }

  toggle() {
    console.log(this);
    this.targetWindow().toggle();
  }

  _onSceneChange(stayInSameWindow) {
    if (!stayInSameWindow) {
      this._swapTargetWindows();
    } else {
      this._queueNextScene();
    }
  }

  _queueNextScene() {
    var currentScene = this.targetWindow().loadedScene;
    var nextScene = this._getNextScene(currentScene);

    if (!nextScene) { console.info("No next scene!"); return; }

    console.log("Current scene '" + currentScene.description + "' ends at " + currentScene.endtime + ", next scene '" + nextScene.description + "' starts at " + nextScene.starttime);
    // If <1s between current and next, queue to the same target
    if (Math.abs(currentScene.endtime - nextScene.starttime) < 1) {
      console.log(" - Queuing next scene '" + nextScene.description + "' in same target");
      this.targetWindow().queuedScene = nextScene;
    } else {
      console.log(" - Loading next scene '" + nextScene.description +"' in different target");
      this.loadSceneToTargetWindow("next", nextScene);
    } 
  }

  _receiveMessage(event) {
    var target = this._targetWindows[event.data.univ];
    if (event.data.message === "handshake_received") {
      console.log("Handshake '" + event.data.univ + "' received!", event);
      target.onConnected(event.data);
    }
    else if (event.data.message === "reconnect_request") {
      target.post({message: "reconnect_response"});
    }
    else if (event.data.message === "playback_state_changed") {
      console.log("Window '" + event.data.univ + "' reports playback state:", event.data.playbackState);
      target.playbackState = event.data.playbackState;
      target.updatePosition(event.data.position);
      this._updatePosition(event.data.value);
    }
    else if (event.data.message === "position") {
      // If paused and no change, don't bother
      if (target.currentPosition === event.data.value && target.playbackState === 3) { return; }
      console.log("Window '" + event.data.univ + "' reports position:", event.data.value);
      target.updatePosition(event.data.value);
      this._updatePosition(event.data.value);
    }
  }

  _swapTargetWindows() {
    console.warn("SWAP TARGET WINDOWS!");
    var currentTarget = this.targetWindow();
    var nextScene = this._getNextScene(currentTarget.loadedScene);

    // Find a target window with the next scene loaded
    var newTarget = this.loadSceneToTargetWindow(nextScene);
    console.log("nextScene is:", nextScene);
    console.log("newTarget is:", newTarget);
    newTarget.play();
    currentTarget.pause();

    this._currentTarget = newTarget;

    this.setState({
      currentScene: newTarget.loadedScene,
      nextScene: this._getNextScene(newTarget.loadedScene),
    }, this._queueNextScene);
  }
}

export default HadronConnector;
