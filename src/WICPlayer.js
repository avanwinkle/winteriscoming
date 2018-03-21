import React, { Component } from "react";
import "./styles/WICPlayer.css";

class WICPlayer extends Component {
  componentDidMount() {
    console.log("mounted!", this.props);
    this.props.onMount();
  }

  render() {
    return (
      <div className="WICPlayerContainer">
        <iframe title="Player"
          id="WICPlayerFrame"
          className="WICPlayerFrame"
          allowFullScreen="true"
          scrolling="no"
          src={this.props.src}></iframe>
      </div>
    );
  }
}

export default WICPlayer;