import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import { grey600, bluegrey100 } from "material-ui/styles/colors";

const muiTheme = getMuiTheme({
  palette: {
    primary1Color: grey600,
    accent1Color: bluegrey100,
  },
  checkbox: {
    color: bluegrey100,
    checkedColor: bluegrey100,
    uncheckedColor: bluegrey100
  },
  radioButton: {
    checkedColor: bluegrey100,
  },
});

const AppContainer = () => (
  <MuiThemeProvider muiTheme={muiTheme}>
    <App />
  </MuiThemeProvider>
);


ReactDOM.render(<AppContainer />, document.getElementById('root'));
registerServiceWorker();
