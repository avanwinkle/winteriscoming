import React, { Component } from "react";
import Filters from "./Filters";
import "./styles/FilterContainer.css";

import AddBox from "material-ui/svg-icons/content/add-box";
import Checkbox from "material-ui/Checkbox";
import CheckBox from "material-ui/svg-icons/toggle/check-box";
import CheckBoxOutlineBlank from "material-ui/svg-icons/toggle/check-box-outline-blank";
import FlatButton from "material-ui/FlatButton";
import IndeterminateCheckBox from "material-ui/svg-icons/toggle/indeterminate-check-box";
import { blueGrey100, blueGrey200, blueGrey600, blueGrey900 } from "material-ui/styles/colors";

class WICFilterContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showFilterDrawer: true,
    };
  }

  _buildCheckboxes(filtertype) {
    return Filters[filtertype].map((filt) => (
      <div key={filt.id} className="filterContainer" onClick={(evt) => this._handleCheck(evt, filt.id)}>
        <Checkbox
          label={filt.name} labelStyle={{color: blueGrey900}}
          checked={this.props.filters.enabled.indexOf(filt.id) !== -1} 
          checkedIcon={this.props.filters.included.indexOf(filt.id) === -1 ? <CheckBox/> :  <AddBox/>}
          uncheckedIcon={this.props.filters.excluded.indexOf(filt.id) === -1 ? <CheckBoxOutlineBlank/> :  <IndeterminateCheckBox/>}
        />
        {filt.description && (
          <div className="filterDescription" style={{color: blueGrey600}}>{filt.description}</div>
        )}
      </div>
    ));
  }

  _handleCheck(evt, filterId) {
    var enabledIdx = this.props.filters.enabled.indexOf(filterId);
    var exclusionIdx = this.props.filters.excluded.indexOf(filterId);
    var inclusionIdx = this.props.filters.included.indexOf(filterId);
    var willForce = evt.nativeEvent.shiftKey;
    var toBeEnabled = willForce ? enabledIdx !== -1 : enabledIdx === -1;
    
    // Enable the checkbox
    if (toBeEnabled) {
      // Remove it from exclusion, if it was there
      if (exclusionIdx !== -1) { this.props.filters.excluded.splice(exclusionIdx, 1); }
      // Add it to inclusion, if force and it's not already included
      if (willForce && inclusionIdx === -1) { this.props.filters.included.push(filterId); }
      // Remove it from inclusion, if force and it is already included
      else if (willForce && inclusionIdx !== -1) { this.props.filters.included.splice(inclusionIdx, 1); }
      // Add it to enabled, if not already there
      if (enabledIdx === -1) { this.props.filters.enabled.push(filterId); }
    }
    // Disable the checkbox
    else {
      // Remove it from inclusion, if it was there
      if (inclusionIdx !== -1) { this.props.filters.included.splice(inclusionIdx, 1); }
      // Remove it from enabled, if it was there
      if (enabledIdx !== -1) { this.props.filters.enabled.splice(enabledIdx, 1); }
      // Add it to exclusion, if force and not already there
      if (willForce && exclusionIdx === -1) { this.props.filters.excluded.push(filterId); }
      // Remove it from exclusion, if not force
      else if (willForce && exclusionIdx !== -1) { this.props.filters.excluded.splice(exclusionIdx, 1); }
    }

    this.props.onFilterChange();
  }

  _handleToggle(__evt) {
    this.setState({ showFilterDrawer: !this.state.showFilterDrawer });
  }

  render() {
    console.log(blueGrey900);
    return (
      <div id="FilterSection" style={{ backgroundColor: blueGrey200 }}>
        <div className="filtersViewTitlebar">
          <FlatButton label={(this.state.showFilterDrawer ? "Hide" : "Show" ) + " Filters"} 
            primary={true} onClick={this._handleToggle.bind(this)} />
        </div>
        { this.state.showFilterDrawer && (
          <div className="filtersViewContainer" style={{color: blueGrey900 }}>
            <div id="filterCharacterContainer" className="categoryContainer">
              { this._buildCheckboxes("characters") }
            </div>
            <div id="filterLocationContainer" className="categoryContainer">
              { this._buildCheckboxes("locations") }
            </div>
            <div id="filterStorylineContainer" className="categoryContainer">
              { this._buildCheckboxes("storylines") }
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default WICFilterContainer;
