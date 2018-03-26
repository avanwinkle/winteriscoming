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
  }

  loadSceneToTargetWindow(scene, target) {
    var targetWindow;
    if (!scene) { return; }

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
        if (this._targetWindows[univ] !== this.state.activeTarget) {
          target = this._targetWindows[univ];
        }
      });
    } else {
      target = this.state.activeTarget;
    }
    return target;
  }

  toggle() {
    this.targetWindow().toggle();
  }

  _onSceneChange(stayInSameWindow) {
    this._updateTargetWindows(stayInSameWindow).then((activeTarget) => {
      
      // Queue the next scene
      var currentScene = activeTarget.loadedScene;
      var nextScene = this._getNextScene(currentScene);

      if (!nextScene) { 
        console.info("No next scene!");
      } else {
        console.log("Current scene '" + currentScene.description + "' ends at " + parseInt(currentScene.endtime, 10) + ", next scene '" + nextScene.description + "' starts at " + parseInt(nextScene.starttime, 10));
        // If <1s between current and next, queue to the same target
        if (currentScene.seasonepisode === nextScene.seasonepisode && Math.abs(currentScene.endtime - nextScene.starttime) < 1) {
          console.log(" - Queuing next scene '" + nextScene.description + "' in same target");
          activeTarget.queuedScene = nextScene;
        } else {
          console.log(" - Loading next scene '" + nextScene.description +"' in different target");
          this.loadSceneToTargetWindow(nextScene, "next");
          activeTarget.queuedScene = undefined;
        }
      }

      this.setState({
        currentScene: currentScene,
        nextScene: nextScene,
      });
    });
  }

  _receiveMessage(event) {
    var target = this._targetWindows[event.data.univ || "blue"];
    if (event.data.message === "handshake_received") {
      console.log("Handshake '" + event.data.univ + "' received!", event);
      target.onConnected(event.data);
    }
    else if (event.data.message === "reconnect_request") {
      target.post({message: "reconnect_response"});
    }
    else if (event.data.message === "playback_state_changed") {
      console.log("Window '" + event.data.univ + "' reports playback state " + event.data.playbackState + " and position ", event.data.position);
      target.playbackState = event.data.playbackState;
      target.updatePosition(event.data.position);
      this._updatePosition(event.data.position);
    }
    else if (event.data.message === "position") {
      // If paused and no change, don't bother
      if (target.currentPosition === event.data.value && target.playbackState === 3) { return; }
      console.log("Window '" + event.data.univ + "' reports position:", event.data.value);
      target.updatePosition(event.data.value);
      this._updatePosition(event.data.value);
    }
  }

  _updateTargetWindows(stayInSameWindow) {
    return new Promise((resolve, __reject) => {
      var outgoingTarget = this.targetWindow();
      
      if (stayInSameWindow) {
        resolve(outgoingTarget);
        return;
      }
  
      var incomingScene = this._getNextScene(outgoingTarget.loadedScene);
      // Find a target window with the next scene loaded
      var incomingTarget = this.loadSceneToTargetWindow(incomingScene);

      console.warn("SWAP TARGET WINDOWS! Looking for scene " + incomingScene.id + ", moving from " + outgoingTarget.univ + " to " + incomingTarget.univ);
      console.log("nextScene is:", incomingScene);
      incomingTarget.play();
      outgoingTarget.pause();

      this.setState({
        activeTarget: incomingTarget,
      }, () => {
        resolve(incomingTarget);
      });
    });
  }
}

export default HadronConnector;
