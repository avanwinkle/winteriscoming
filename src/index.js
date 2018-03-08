import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import { grey600, lightBlue600 } from "material-ui/styles/colors";

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: grey600,
    accent1Color: lightBlue600,
  },
  checkbox: {
    checkedColor: lightBlue600,
  },
  radioButton: {
    checkedColor: lightBlue600,
  },
});

const AppContainer = () => (
  <MuiThemeProvider muiTheme={muiTheme}>
    <App />
  </MuiThemeProvider>
);


ReactDOM.render(<AppContainer />, document.getElementById('root'));
registerServiceWorker();
