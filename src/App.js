import React, { Component } from 'react';
import Filters from './Filters';
import './App.css';

const hboUri = "http://localhost.hadron.aws.hbogo.com:3000"
// const wicUri = "http://localhost.hadron.aws.hbogo.com:4000"

class SceneMap {
  constructor() {
    this.scenes = []
    fetch("https://spreadsheets.google.com/feeds/list/1iSeYTRX2h7IJHLIa0oFuKirI3SxsXQkqoMkFsv5Aer4/od6/public/values?alt=json")
    .then(res => res.json()).then(
      (result) => {
        console.log("Got some json!", result);
        result.feed.entry.forEach((sceneEntry) => {
          this.scenes.push(new Scene(sceneEntry))
        });
        console.log(this.scenes)
      }, (error) => {
        console.error(error);
      }
    );
  }
}

class Scene  {
  constructor(sceneEntry) {
    for (var property in sceneEntry) {
      if (property.indexOf("gsx$") === 0 && sceneEntry.hasOwnProperty(property)) {
        property = property.replace("gsx$", "")
        this[property] = this._getEntryProperty(property, sceneEntry)
      }
    }
    this.id = (this.season * 10000) + (this.episode * 100) + this.scene;
    this.duration = this.endtime - this.starttime;
  }

  _getEntryProperty(prop, sceneEntry) {
    var value = sceneEntry["gsx$" + prop]["$t"];

    if (Filters.keys[prop] !== undefined) {
      return value !== "" ? value.split(/, ?/) : [];
    } else if (value.match(/^\d+$/)) {
      return parseInt(value, 10)
    } else {
      return value !== "" ? value : undefined;
    }
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.targetWindow = undefined;
    this.scenes = [];
    this.connectionState = "NOT_CONNECTED";
    this.state = {
      isPlaying: false,
      seekTime: 0,
      currentPosition: 0,
      connection: this.connectionState,
    }
  }

  componentDidMount() {
    this.sceneMap = new SceneMap();
  }

  _postMessage(action) {
    var param;
    if (action === "seek") {
      param = parseInt(this.state.seekTime, 10);
    } else if (action === "toggle") {
      action = this.state.isPlaying ? "pause" : "play";
    }

    if (!this.targetWindow) { this._launchHBOWindow() }

    this.targetWindow.postMessage({
      message: "wic-controlaction",
      action: action,
      param: param,
    }, hboUri);
    console.log(" - POSTED!")
    this.setState({ isPlaying: !this.state.isPlaying });
  }

  _receiveMessage(event) {
    console.log(event)
    if (event.data.message === "handshake_received") {
      console.log("HANDSHAKE!")
      this.connectionState = "CONNECTED"
      this.setState({ connection: this.connectionState });
    }
    if (event.data.message === "position") {
      this.setState({ currentPosition: event.data.value });
    }
  }

  _handleSeekTime(evt) {
    console.log(evt)
    this.setState({ seekTime: evt.target.value });
  }

  _launchHBOWindow() {
    console.log("Launching HBO!");
    this.connectionState = "NOT_CONNECTED";
    
    var episodeId = "GVVD52AFtf8NosSQJAAGb";
    this.targetWindow = window.open(hboUri + "/episode/urn:hbo:episode:" + episodeId + "?autoplay=true",
                                    "WIC-HBOWindow",
                                    "width=800,height=600");
    window.addEventListener("message", this._receiveMessage.bind(this));
    this.connectionState = "OPENING";
    this._startHandshake();
  }

  _startHandshake() {
    if (!this.targetWindow) {
      console.error("Cannot check handshake without target window");
      return;
    }
    else if (this.connectionState === "OPENING") {
      this.connectionState = "POLLING";
      this.targetWindow.postMessage({ message: "handshake_request" }, hboUri);  
    }
    else if (this.connectionState === "POLLING") {
      console.log("Polling target window for handshake...", this.connectionState)
      this.setState({ connection: this.connectionState });
    }
    else {
      console.log("Inactive connection state '" + this.connectionState + "', cancelling poll.");
      return;
    }
    setTimeout(this._startHandshake.bind(this), 1000);
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src="images/got-logo-white.png" alt="logo" style={{ opacity: 0.5 }}/>
        </header>
        <p className="App-intro">
        </p>
        {/*
        <div className="player" style={{width:"800px", height:"400px", backgroundColor:"black"}}>
          <object id="ifp" data="ifphls.swf" type="application/x-shockwave-flash" width="100%" height="100%">
            <param name="FlashVars" value="videoId=1920&amp;loadVideo=http%3A%2F%2Fhls3.pro11.lv3.cdn.hbogo.com%2Fvideos%2FPRO11%2Fgov2%2Fe5%2Fhbo%2Ffeature%2F634424%2F263255_820888e59fb76b1172e7a649d35dcc7d%2Fhbo_263255_820888e59fb76b1172e7a649d35dcc7d_PRO11%2Fbase_index_c9_14_access.m3u8&amp;setDRMToken=BtOuhn3VIEVd" />
            <param name="FlashVars" value="videoId=1879&amp;loadVideo=http%3A%2F%2Fpdl.misc.lv3.hbogo.com%2Fpreroll%2Fv2%2Fhbo%2FPRO11%2Fhbo_12796940_PRO11%2Fbase_index_c8_14.m3u8&amp;setFallbackUri=http%3A%2F%2Fhls3.pro11.lv3.cdn.hbogo.com%2Fvideos%2FPRO11%2Fgov2%2Fe5%2Fhbo%2Ffeature%2F634424%2F263255_820888e59fb76b1172e7a649d35dcc7d%2Fhbo_263255_820888e59fb76b1172e7a649d35dcc7d_PRO11%2Fbase_index_c9_14_access.m3u8%2C&amp;setDRMToken=Yxy6f0CnpyaD" />
            <param name="FlashVars" value="videoId=7388&amp;loadVideo=http%3A%2F%2Fhls3.pro11.lv3.cdn.hbogo.com%2Fvideos%2FPRO11%2Fgov2%2Fe5%2Fhbo%2Ffeature%2F634424%2F263255_820888e59fb76b1172e7a649d35dcc7d%2Fhbo_263255_820888e59fb76b1172e7a649d35dcc7d_PRO11%2Fbase_index_c9_14_access.m3u8&amp;setDRMToken=BjF0gxr2fT4J" />
            <param name="quality" value="high" />
            <param name="bgcolor" value="#000000" />
            <param name="wmode" value="transparent" />
            <param name="allowscriptaccess" value="always" />
            <param name="allowfullscreen" value="true" />
            <param name="play" value="true" />
          </object>
        </div>
        */}
        <button onClick={this._launchHBOWindow.bind(this)}>Launch HBO</button>
        <br/><br/>
        <button onClick={(e) => this._postMessage("toggle")}>{this.state.isPlaying ? "Pause" : "Play"}</button>
        <br/><br/>
        <input type="number" value={this.state.seekTime} onChange={this._handleSeekTime.bind(this)} />
        <button onClick={(e) => this._postMessage("seek")}>Seek</button>
        <div style={{ position: "absolute", bottom: 0, left: 0 }}>{this.state.currentPosition}</div>
        <div style={{ position: "absolute", bottom: 0, right: 0 }}>{this.state.connection}</div>
      </div>
    );
  }
}

export default App;
