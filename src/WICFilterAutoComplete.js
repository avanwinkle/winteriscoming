import React, { Component } from "react";
import AutoComplete from "material-ui/AutoComplete";
import Filters from "./Filters";

class FilterAutoComplete extends Component {
  constructor(props) {
    super(props);
    this._names = Filters.getAllNames();
    this.state = {
      searchText: "",
    };
  }

  _handleUpdateInput(searchText) {
    this.setState({
      searchText: searchText,
    });
  }

  render() {
    return (
      <AutoComplete 
        searchText={this.state.searchText}
        filter={AutoComplete.fuzzyFilter}
        dataSource={this._names}
        onUpdateInput={this._handleUpdateInput.bind(this)}
      />
    );
  }
}

export default FilterAutoComplete;