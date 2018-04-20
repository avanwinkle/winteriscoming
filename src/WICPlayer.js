import React, { Component } from "react";
import "./styles/WICPlayer.css";

class WICPlayer extends Component {
  componentDidMount() {
    console.log("mounted!", this.props);
    if (this.props.onMount) {
      this.props.onMount();
    }
  }

  render() {
    return (
      <div className="WICPlayerContainer">
        <iframe title="Player" key="blue"
          id="blueWICPlayerFrame"
          style={{ borderColor: "blue", height: this.props.activeUniv === "blue" ? undefined : 0 }}
          className="WICPlayerFrame"
          allowFullScreen="true"
          scrolling="no"
          src={this.props.src}></iframe>
        <iframe title="Player" key="red"
          id="redWICPlayerFrame"
          style={{ borderColor: "red", height: this.props.activeUniv === "red" ? undefined : 0 }}
          className="WICPlayerFrame"
          allowFullScreen="true"
          scrolling="no"
          src={this.props.src}></iframe>
      </div>
    );
  }
}

export default WICPlayer;