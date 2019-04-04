/**
 * EmbedSheet controller
 * @author Chase Cathcart <https://github.com/ChaseOnTheWeb>
 */

import EmbedSheetData from './data';
import EmbedSheetRenderer from './renderer';
var _idCounter = 0;

var defaultOptions = {
  columns: [],
  sortby: [],
  filters: [],
  query: {},
  rows_per_page: 500
};

function onReady(cb) {
  if (document.readyState != 'loading') cb();
  else if (document.addEventListener) document.addEventListener('DOMContentLoaded', cb);
  else document.attachEvent('onreadystatechange', function () {
    if (document.readyState != 'complete') cb(); // IE <= 8 (interactive not supported)
  });
}

export default function EmbedSheet(url, elem, options) {
  'use strict';

  this.baseID = elem.id ? elem.id : 'embed-sheet-' + _idCounter++;

  this.options = parseOptions(options);

  var container = document.createElement('div');
  container.id = this.baseID + '-container';
  elem.parentNode.insertBefore(container, elem);
  container.innerHTML = 'Loading...';

  var _this = this;
  EmbedSheetData.fromURL(url, this.options, function (store) {
    var renderer = new EmbedSheetRenderer(store, _this.options);
    _this.store = store;
    container.innerHTML = '';
    container.insertBefore(renderer.render(), null);
    container.insertBefore(elem, null);
  });
}

EmbedSheet.fromLink = function (elem) {
  function splitOptions(str) {
    return str.split(',').map(function (v) { return v.trim(); });
  }

  var options = {};

  for (var opt in defaultOptions) {
    var data = elem.getAttribute('data-sheet-' + opt.replace(/_/g, '-'));

    if (data) {
      switch (opt) {
        case 'columns':
        case 'sortby':
        case 'filters':
          options[opt] = splitOptions(data);
          break;
        case 'query':
          try {
            options[opt] = JSON.parse(data);
          } catch (e) {
            options[opt] = {};
          }
          break;
        case 'rows_per_page':
          options[opt] = parseInt(data);
          break;
      }
    }
  }

  return new EmbedSheet(elem.href, elem, options);
}

EmbedSheet.fromLinks = function () {
  var links = document.querySelectorAll('a[data-embed-type=sheet]');

  for (var i=0; i < links.length; ++i) {
    EmbedSheet.fromLink(links[i]);
  }
}

function parseOptions(userOptions) {
  function parseFilter(v) {
    switch (v[0]) {
      case '*':
        return { col: v.slice(1), required: true };
      case '_':
        return { col: v.slice(1), required: false, textfield: true };
      default:
        return { col: v, required: false };
    }
  }

  var inputs = [defaultOptions, userOptions || {}];
  var options = {};

  for (var i = 0, length = inputs.length; i < length; ++i) {
    var obj = inputs[i];
    for (var prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        options[prop] = obj[prop];
      }
    }
  }

  options.sortby = options.sortby.map(function (v) { return v[0] == '-' ? [v.slice(1), true] : v });
  options.filters = options.filters.map(parseFilter);

  return options;
}

onReady(EmbedSheet.fromLinks);
