/**
 * EmbedSheet user interface
 * @author Chase Cathcart <https://github.com/ChaseOnTheWeb>
 *
 * Outputs the matching data in a filterable table.
 */

export default function EmbedSheetRenderer(store, options) {
  this.store = store;
  this.options = options;
  this.page = 0;
}

EmbedSheetRenderer.prototype.render = function () {
  var frag = document.createDocumentFragment();
  var tableContainer = document.createElement('div');
  var filters = document.createElement('form');
  var total = document.createElement('output');
  var _this = this;

  function getData() {
    var conditions = Object.create(_this.options.query);

    for (var i = 0, len = filters.elements.length; i < len; ++i) {
      var elem = filters.elements[i];

      if (elem.name && elem.name.indexOf('filter_') === 0 && elem.value) {
        conditions[elem.name.slice(7)] = elem.type == 'text' ? { '$regex': [elem.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'] } : { '$aeq': elem.value };
      }
    }

    var data = _this.store.pagedQuery(conditions, _this.page);
    _this.page = data.page;
    total.innerHTML = "Page " + (data.page + 1) + " of " + (data.max_pages + 1);
    tableContainer.innerHTML = _this.renderTable(data.data, _this.options);
  }

  filters.addEventListener('change', getData, false);
  filters.addEventListener('keyup', getData, false);

  for (var i = 0; i < this.options.filters.length; ++i) {
    filters.appendChild(this.renderFilter(this.options.filters[i]));
  }

  filters.appendChild(total);

  frag.appendChild(filters);

  getData();
  frag.appendChild(tableContainer);

  var jumpToPage = function (page) {
    _this.page = page;
    getData();
    tableContainer.scrollIntoView(true);
    tableContainer.focus();
  }

  var prevButton = document.createElement('button');
  prevButton.innerHTML = "Previous";
  prevButton.addEventListener('click', function () { if (_this.page > 0) { jumpToPage(_this.page - 1); } }, false);
  frag.appendChild(prevButton);

  var nextButton = document.createElement('button');
  nextButton.innerHTML = "Next";
  nextButton.addEventListener('click', function () { jumpToPage(_this.page + 1); }, false);
  frag.appendChild(nextButton);

  return frag;
}

EmbedSheetRenderer.prototype.renderFilter = function (filter) {
  var filterData = this.store.getFilter(filter.col);

  var label = document.createElement('label');
  label.textContent = filterData.label;

  var select = document.createElement(filter.textfield ? 'input' : 'select');
  select.name = 'filter_' + filter.col;

  if (!filter.textfield) {
    if (!filter.required) {
      var elem = document.createElement('option');
      elem.textContent = " - All - ";
      elem.value = "";
      select.appendChild(elem);
    }

    for (var i = 0, l = filterData.choices.data.length; i < l; ++i) {
      var elem = document.createElement('option');

      elem.textContent = elem.value = filterData.choices.data[i].value;
      if (filter.required && i == 0) elem.selected = true;

      select.appendChild(elem);
    }
  }

  label.appendChild(select);
  return label;
}

EmbedSheetRenderer.prototype.renderTable = function (data) {
  var headerrow = this.options.columns.map(function (v) { return '<th>' + this.store.headers[v] + '</th>'; }, this).join('');

  var output = '<table class="embed-sheet-table">';
  output += '<thead><tr>' + headerrow + '</tr></thead>';
  for (var i = 0, l = data.length; i < l; ++i) {
    var row = this.options.columns.map(function (v) { return '<td>' + data[i][v] + '</td>' }).join('');
    output += '<tr>' + row + '</tr>';
  }
  output += '</table>';

  return output;
}
