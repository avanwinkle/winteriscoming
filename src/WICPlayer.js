import React, { Component } from "react";
import "./styles/WICPlayer.css";

class WICPlayer extends Component {
  render() {
    return (
      <div className="WICPlayerContainer">
        <iframe title="Player"
          className="WICPlayerFrame"
          src="http://localhost.hadron.aws.hbogo.com:3000/extra/urn:hbo:extra:GVU3NGQRWDI7DwvwIAXbD"></iframe>
      </div>
    );
  }
}

export default WICPlayer;