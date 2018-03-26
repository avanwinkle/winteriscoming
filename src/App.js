import React from "react";
import HadronConnector from "./HadronConnector";
import SceneMap from "./SceneMap";
import EpisodeMap from "./EpisodeMap";
import WICEpisodeList from "./WICEpisodeList";
import WICFilterContainer from "./WICFilterContainer";
import WICPlayer from "./WICPlayer";
import "./App.css";


// const wicUri = "http://localhost.hadron.aws.hbogo.com:4000"

class App extends HadronConnector {
  constructor(props) {
    super(props);
    this._pollingCount = 0;
    this._pendingScene = undefined;

    this._filters = {
      enabled: [],   // List of ids of ALL filters, sorted by priority
      excluded: [], // List of ids of filters to be EXCLUDED
      included: [], // List of ids of filters to be INCLUDED
    };
    
    this.state = {
      activeTarget: this._targetWindows.blue,
      isPlaying: false,
      scenes: [],
      episodes: [],
      currentPosition: 0,
      currentScene: undefined,
      nextScene: undefined,
      connection: this.connectionState,
      targetUri: undefined,
      targets: { blue: this._targetWindows.blue, red: this._targetWindows.red },
    };
  }

  componentDidMount() {
    SceneMap.onReady((__scenes) => {
      var scenes = SceneMap.filterScenes(this._filters);
      
      this.setState({ 
        scenes: scenes,
        episodes: EpisodeMap.filterEpisodes(scenes),
      }, () => {
        window.addEventListener("message", this._receiveMessage.bind(this));
        this.state.targets.blue.connect(scenes[0]).then(() => {
          this._onSceneChange(true);
        });
      });
    });
  }

  _getCurrentEpisode() {
    return EpisodeMap.getEpisode((this.state.currentScene ? this.state.currentScene : this.state.scenes[0]).seasonepisode);
  }

  _getSceneByPosition(position) {
    var nextCurrentScene = this.state.scenes[0];
    var nextNextScene = this._getNextScene(nextCurrentScene);
    var episode = this.state.activeTarget.loadedScene.seasonepisode;

    console.log(nextCurrentScene, nextNextScene);
    if (position < nextCurrentScene.endtime) {
      console.log("Playback has automatically transitioned into another scene");
    } else {
      console.log("Playback is far ahead of the current scene, skipping forward...");
      while (nextNextScene !== undefined && (episode !== nextNextScene.seasonepisode || position > nextNextScene.starttime)) {
        nextCurrentScene = nextNextScene;
        nextNextScene = this._getNextScene(nextNextScene);
      }
    }
    return nextCurrentScene;
  }

  _getNextScene(currentScene, scenes) {
    scenes = scenes || this.state.scenes;
    currentScene = currentScene || this.state.currentScene;
    var currentIdx = scenes.indexOf(currentScene);
    var nextScene;

    // If the current scene does not exist in the list of scenes, return the first scene
    // (e.g. we assume the filters have changed and the current scene is no longer enabled)
    if (currentIdx === -1) {
      nextScene = scenes[0];
    } 
    // If the current scene does exist, the next scene will be next (if we're not at the end of the array)
    else if (currentIdx < scenes.length - 1) {
      nextScene = scenes[currentIdx + 1];
    }
    return nextScene;
  }

  goToScene(scene) {
    if (scene === undefined) { 
      console.warn("Unable to go to scene undefined");
      return;
    }
    // Store the upcoming scene synchronously in case position updates come in before we can seek to it
    this._pendingScene = scene;

    this.loadSceneToTargetWindow(scene, "current");

    this.setState({
      currentScene: scene,
      nextScene: this._getNextScene(scene),
    }, () => { this._onSceneChange(true); } );
  }

  _updatePosition(newPosition) {
    this.setState({ currentPosition: newPosition });
  }

  _handleFilterChange() {
    var scenes = SceneMap.filterScenes(this._filters);
    this.setState({ 
      scenes: scenes,
      episodes: EpisodeMap.filterEpisodes(scenes),
    }, () => {
      // If the current target is already hosting the first scene, stay in same window
      this._onSceneChange(this.state.activeTarget === this.loadSceneToTargetWindow(scenes[0]));
    });
  }

  _handlePlay() {
    this.toggle();
  }

  _handleNav(action) {
    switch (action) {
    case "prevFrameMd":
      this.seek(this.state.currentPosition - 1);
      break;
    case "nextFrameMd":
      this.seek(this.state.currentPosition + 1);
      break;
    case "prevFrameSm":
      this.seek(this.state.currentPosition - 1.4);
      this.seek(this.state.currentPosition + 1);
      break;
    case "nextFrameSm":
      console.log("Calling nextframe, currentPosition is:", this.state.currentPosition);
      this.seek(this.state.currentPosition + 1.4);
      this.seek(this.state.currentPosition - 1);
      break;
    case "nextScene":
      this.goToScene(this._getNextScene());
      break;
    case "firstScene":
      this.goToScene(this.state.scenes[0]);
      break;
    default:
      console.warn("Unknown nav action '" + action +"'");
    }
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src="images/got-logo-white.png" alt="logo" style={{ opacity: 0.05 }}/>
        </header>
        <div id="ContentSection">
          <div id="PlayerSection">
            { this._useIframe && this.state.targetUri && (
              <WICPlayer key="blue"
                src={this.state.targetUri}
                onMount={this._connectHBOWindow.bind(this)} />
            )}
            <div id="PlayerControlSection" style={{textAlign: "left"}}>
              <br/>
              <button onClick={(__e) => this._handleNav("firstScene")}>&lt;&lt; Start from Beginning</button>
              <button onClick={(__e) => this._handlePlay()}>{this.state.isPlaying ? "Pause" : "Play"}</button>
              <button onClick={(__e) => this._handleNav("nextScene")} enabled={(!!this.state.nextScene).toString()}>Next Scene &gt;</button>
              <br/><br/>
              <button onClick={(__e) => this._handleNav("prevFrameMd")}>&lt;&lt;| 1s </button>
              &nbsp;
              <button onClick={(__e) => this._handleNav("prevFrameSm")}>&lt;| 0.4s </button>
              &nbsp;&nbsp;
              <button onClick={(__e) => this._handleNav("nextFrameSm")}>0.4s |&gt;</button>
              &nbsp;
              <button onClick={(__e) => this._handleNav("nextFrameMd")}>1s |&gt;&gt;</button>
              <br /><br/>
            </div>
          </div>
          <WICEpisodeList 
            episodes={this.state.episodes} 
            currentScene={this.state.currentScene} 
            onScenePlay={this.goToScene.bind(this)}
          />
        </div>
        <WICFilterContainer filters={this._filters} onFilterChange={this._handleFilterChange.bind(this)}/>
        <div id="StatusSection">
          <div>{this.state.connection}</div>
          <div>{parseInt((this.state.currentPosition||0)*100, 10)/100}</div>
        </div>
        <div id="TargetDebug">
          {["blue", "red"].map((univ) => {
            var target = this.state.targets[univ];
            return (
              <div key={univ} className="targetDebugContainer">
                <div className={target === this.state.activeTarget ? "activeTarget" : "inactiveTarget"}>
                  <b style={{textTransform:"uppercase"}}>{univ} [{target.loadedScene ? target.loadedScene.seasonepisode : -1}]</b>
                </div>
                <div>Position: {parseInt(target.currentPosition*100, 10)/100}</div>
                <div>From End: {target.loadedScene ? parseInt((target.loadedScene.episode.duration - target.currentPosition)*100, 10)/100 : "N/A"}</div>
                <div>State: {target.playbackState}</div>
                <div>
                  Current: {target.loadedScene ? target.loadedScene.description : "None"}
                  <br />
                  In/Out: {target.loadedScene ? parseInt(target.loadedScene.starttime, 10) + ":" + parseInt(target.loadedScene.endtime) : " N/A"}
                </div>
                <div>
                  Queued: {target.queuedScene ? target.queuedScene.description : "None"}
                  <br />
                  In/Out: {target.queuedScene ? parseInt(target.queuedScene.starttime, 10) + ":" + parseInt(target.queuedScene.endtime) : " N/A"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default App;
