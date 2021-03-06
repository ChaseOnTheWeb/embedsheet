/**
 * EmbedSheet user interface
 * @author Chase Cathcart <https://github.com/ChaseOnTheWeb>
 *
 * Outputs the matching data in a filterable table.
 */

// Debounce function from Underscore.js (MIT license)
// Rate limits how many times in a time period the function can execute
function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

export default function EmbedSheetRenderer(store, options) {
  this.store = store;
  this.options = options;
  this.activePage = 0;
  this.filterConditions = {};
  this.component = document.createElement('div');
}

EmbedSheetRenderer.prototype.getPagedData = function (page) {
  var conditions = Object.assign({}, this.options.query, this.filterConditions);

  var query = this.store.pagedQuery(conditions, page);
  this.activePage = query.page;

  var event = new CustomEvent('datarefresh', { detail: { query: query } });
  this.component.dispatchEvent(event);
}

EmbedSheetRenderer.prototype.render = function () {
  var tableContainer = document.createElement('div');
  tableContainer.classList.add('table-container');

  this.component.appendChild(this.renderFilters());
  this.component.appendChild(this.renderPager());
  this.component.appendChild(tableContainer);
  this.component.appendChild(this.renderPager());

  var updateTable = function (event) {
    var query = event.detail.query;

    var existingTable = tableContainer.firstChild;
    if (existingTable) {
      tableContainer.removeChild(existingTable);
    }

    tableContainer.appendChild(this.renderTable(query.data));
  }

  this.component.addEventListener('datarefresh', updateTable.bind(this), true);

  this.getPagedData(0);

  return this.component;
}

EmbedSheetRenderer.prototype.renderPager = function () {
  var container = document.createElement('nav');
  var total = document.createElement('output');
  var prevButton = document.createElement('button');
  var nextButton = document.createElement('button');

  container.classList.add('embed-pager');
  container.setAttribute('aria-label', 'Data table navigation');

  total.classList.add('embed-pager-current');

  prevButton.classList.add('embed-pager-previous');
  prevButton.innerHTML = "Previous";
  prevButton.setAttribute('data-pager-jump', '-1');

  nextButton.classList.add('embed-pager-next');
  nextButton.innerHTML = "Next";
  nextButton.setAttribute('data-pager-jump', '+1');

  container.appendChild(total);
  container.appendChild(prevButton);
  container.appendChild(nextButton);

  var onClick = function(event) {
    if (event.target.hasAttribute('data-pager-jump')) {
      var newPage = this.activePage + Number(event.target.getAttribute('data-pager-jump'));

      this.getPagedData(newPage);
      this.component.scrollIntoView({ behavior: "smooth" });
      this.component.querySelector('.table-container').focus();
    }
  };

  container.addEventListener('click', onClick.bind(this), false);

  this.component.addEventListener('datarefresh', function(event) {
    var query = event.detail.query;

    total.innerHTML = "Page " + (query.page + 1) + " of " + (query.max_pages + 1);

    prevButton.disabled = query.page <= 0;
    nextButton.disabled = query.page >= query.max_pages;
  }, true);

  return container;
}

EmbedSheetRenderer.prototype.renderFilters = function() {
  var filters = document.createElement('form');
  filters.classList.add('embed-filter-form');

  for (var i = 0; i < this.options.filters.length; ++i) {
    filters.appendChild(this.renderFilter(this.options.filters[i]));
  }

  return filters;
}

EmbedSheetRenderer.prototype.setFilterValue = function (elem) {
  var field = elem.name.slice(7);

  if (elem.value) {
    this.filterConditions[field] = elem.type == 'text' ? { '$regex': [elem.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'] } : { '$aeq': elem.value };
  }
  else if (field in this.filterConditions) {
    delete this.filterConditions[field];
  }
}

EmbedSheetRenderer.prototype.renderFilter = function (filter) {
  var filterData = this.store.getFilter(filter.col);

  var label = document.createElement('label');
  label.classList.add('embed-filter-label');
  label.textContent = filterData.label;

  var select = document.createElement(filter.textfield ? 'input' : 'select');
  select.classList.add('embed-filter-input');
  select.name = 'filter_' + filter.col;

  var onChange = debounce(function() {
    this.setFilterValue(select);
    this.getPagedData(this.activePage);
  }, 300);

  select.addEventListener('change', onChange.bind(this), false);
  select.addEventListener('keyup', onChange.bind(this), false);

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

  this.setFilterValue(select);
  label.appendChild(select);
  return label;
}

EmbedSheetRenderer.prototype.renderTable = function (data) {
  var table = document.createElement('table');
  var thead = document.createElement('thead');
  var tbody = document.createElement('tbody');

  table.className = 'embed-sheet-table';

  this.options.columns.map(function (v) {
    var th = document.createElement('th');
    th.appendChild(document.createTextNode(this.store.headers[v]));
    return th;
  }, this).forEach(function(el) {
    thead.appendChild(el);
  });

  for (var i = 0, l = data.length; i < l; ++i) {
    tbody.appendChild(this.renderTableRow(data[i]));
  }

  table.appendChild(thead);
  table.appendChild(tbody);

  return table;
}

EmbedSheetRenderer.prototype.renderTableRow = function(data) {
  data = Object.assign({}, data);
  for (var p in this.options.row_processors) {
    if (p in EmbedSheet.rowProcessors) {
      var args = Array.isArray(this.options.row_processors[p]) ? [data].concat(this.options.row_processors[p]) : [data];
      EmbedSheet.rowProcessors[p].apply(null, args);
    }
  }

  var tr = document.createElement('tr');
  var row = this.options.columns.map(function (v) {
    // A row processor may have returned a node for a field if it wants to
    // output HTML. Data from the sheet should be treated as text and is thus
    // sanitized.
    var td = document.createElement('td');
    if (data[v] instanceof Node) {
      td.appendChild(data[v]);
    }
    else if (data[v]) {
      td.appendChild(document.createTextNode(data[v]));
    }

    return td;
  });

  row.forEach(function (td) { tr.appendChild(td); });
  return tr;
}
