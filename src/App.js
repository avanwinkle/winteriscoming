import React, { Component } from "react";
import Checkbox from "material-ui/Checkbox";
import AddBox from "material-ui/svg-icons/content/add-box";
import CheckBox from "material-ui/svg-icons/toggle/check-box";
import CheckBoxOutlineBlank from "material-ui/svg-icons/toggle/check-box-outline-blank";
import IndeterminateCheckBox from "material-ui/svg-icons/toggle/indeterminate-check-box";
import Filters from "./Filters";
import SceneMap from "./SceneMap";
import "./App.css";

const hboUri = "http://localhost.hadron.aws.hbogo.com:3000";
// const wicUri = "http://localhost.hadron.aws.hbogo.com:4000"

class App extends Component {
  constructor(props) {
    super(props);
    this.targetWindow = undefined;
    this.scenes = [];
    this.connectionState = "NOT_CONNECTED";
    
    this._enabledFilters = [];   // List of ids of ALL filters, sorted by priority
    this._exclusionFilters = []; // List of ids of filters to be EXCLUDED
    this._inclusionFilters = []; // List of ids of filters to be INCLUDED
    
    this.state = {
      isPlaying: false,
      seekTime: 0,
      currentPosition: 0,
      connection: this.connectionState,
      enabledFilters: this._enabledFilters,
      exclusionFilters: this._exclusionFilters,
      inclusionFilters: this._inclusionFilters,
    };
  }

  componentDidMount() {
  }

  _postMessage(action) {
    var param;
    if (action === "seek") {
      param = parseInt(this.state.seekTime, 10);
    } else if (action === "toggle") {
      action = this.state.isPlaying ? "pause" : "play";
    }

    if (!this.targetWindow) { this._launchHBOWindow(); }

    this.targetWindow.postMessage({
      message: "wic-controlaction",
      action: action,
      param: param,
    }, hboUri);
    console.log(" - POSTED!");
    this.setState({ isPlaying: !this.state.isPlaying });
  }

  _receiveMessage(event) {
    console.log(event);
    if (event.data.message === "handshake_received") {
      console.log("HANDSHAKE!");
      this.connectionState = "CONNECTED";
      this.setState({ connection: this.connectionState });
    }
    if (event.data.message === "position") {
      this.setState({ currentPosition: event.data.value });
    }
  }

  _handleCheck(evt, newVal, filterId) {
    var enabledIdx = this._enabledFilters.indexOf(filterId);
    var exclusionIdx = this._exclusionFilters.indexOf(filterId);
    var inclusionIdx = this._inclusionFilters.indexOf(filterId);
    var willForce = evt.nativeEvent.shiftKey;
    // If we are changing the force, don't toggle
    if (willForce) {
      newVal = !newVal;
    }
    console.log(enabledIdx, exclusionIdx, inclusionIdx, willForce, newVal);

    // Enable the checkbox
    if (newVal) {
      // Remove it from exclusion, if it was there
      if (exclusionIdx !== -1) { this._exclusionFilters.splice(exclusionIdx, 1); }
      // Add it to inclusion, if force and it's not already
      if (willForce && inclusionIdx === -1) { this._inclusionFilters.push(filterId); }
      // Remove it from inclusion, if force and it is already
      else if (willForce && inclusionIdx !== -1) { this._inclusionFilters.splice(inclusionIdx, 1); }
      // Add it to enabled, if not already there
      if (enabledIdx === -1) { this._enabledFilters.push(filterId); }
    }
    // Disable the checkbox
    else {
      // Remove it from inclusion, if it was there
      if (inclusionIdx !== -1) { this._inclusionFilters.splice(inclusionIdx, 1); }
      // Remove it from enabled, if it was there
      if (enabledIdx !== -1) { this._enabledFilters.splice(enabledIdx, 1); }
      // Add it to exclusion, if force and not already there
      if (willForce && exclusionIdx === -1) { this._exclusionFilters.push(filterId); }
      // Remove it from exclusion, if not force
      else if (willForce && exclusionIdx !== -1) { this._exclusionFilters.splice(exclusionIdx, 1); }
    }

    this.setState({
      enabledFilters: this._enabledFilters,
      exclusionFilters: this._exclusionFilters,
      inclusionFilters: this._inclusionFilters,
    });

    this.scenes = SceneMap.filterScenes(this._enabledFilters, this._exclusionFilters, this._inclusionFilters);
    console.log(this.scenes);
  }

  _handleSeekTime(evt) {
    this.setState({ seekTime: evt.target.value });
  }

  _launchHBOWindow() {
    console.log("Launching HBO!");
    this.connectionState = "NOT_CONNECTED";
    
    var episodeId = "GVVD52AFtf8NosSQJAAGb";
    this.targetWindow = window.open(
      hboUri + "/episode/urn:hbo:episode:" + episodeId + "?autoplay=true",
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
      console.log("Polling target window for handshake...", this.connectionState);
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
          <img src="images/got-logo-white.png" alt="logo" style={{ opacity: 0.05 }}/>
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
        <button onClick={(__e) => this._postMessage("toggle")}>{this.state.isPlaying ? "Pause" : "Play"}</button>
        <br/><br/>
        <input type="number" value={this.state.seekTime} onChange={this._handleSeekTime.bind(this)} />
        <button onClick={(__e) => this._postMessage("seek")}>Seek</button>
        <div className="categoryContainer">
          { Filters.characters.map((char) => (
            <Checkbox key={char.id} label={char.name} 
              checked={this.state.enabledFilters.indexOf(char.id) !== -1} 
              checkedIcon={this.state.inclusionFilters.indexOf(char.id) === -1 ? <CheckBox/> :  <AddBox/>}
              uncheckedIcon={this.state.exclusionFilters.indexOf(char.id) === -1 ? <CheckBoxOutlineBlank/> :  <IndeterminateCheckBox/>}
              onCheck={(evt, newVal) => this._handleCheck(evt, newVal, char.id)}/>
          ))
          }
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0 }}>{this.state.currentPosition}</div>
        <div style={{ position: "absolute", bottom: 0, right: 0 }}>{this.state.connection}</div>
      </div>
    );
  }
}

export default App;
