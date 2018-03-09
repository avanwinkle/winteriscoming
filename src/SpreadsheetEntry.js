import Filters from "./Filters";

class SpreadsheetEntry {
  constructor(entry) {
    for (var property in entry) {
      if (property.indexOf("gsx$") === 0 && entry.hasOwnProperty(property)) {
        property = property.replace("gsx$", "");
        this[property] = this._getEntryProperty(property, entry);
      }
    }
  }

  _getEntryProperty(prop, entry) {
    var value = entry["gsx$" + prop]["$t"];

    if (Filters.keys[prop] !== undefined) {
      return value !== "" ? value.split(/, ?/) : [];
    } else if (value.match(/^\d+$/)) {
      return parseInt(value, 10);
    } else {
      return value !== "" ? value : undefined;
    }
  }
}

export default SpreadsheetEntry;
