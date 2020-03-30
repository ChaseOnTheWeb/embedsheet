/**
 * EmbedSheet data store
 * @author Chase Cathcart <https://github.com/ChaseOnTheWeb>
 *
 * Reads the contents of a fetched URL into a Loki in-memory database.
 */

import XLSX from 'xlsx';
import loki from 'lokijs';

// We don't want all the codepages from cpexcel.js because it makes the script
// huge. However, we may need some of the file encoding utility functions.
window.cptable = {};
require('codepage/cputils');

export default function EmbedSheetData(data, options) {
  this.db = new loki();
  this.items = this.db.addCollection('item');
  this.headers = {};
  this.options = options;

  var workbook = XLSX.read(data, { type: 'array', cellFormula: false, cellHTML: false, cellText: false });
  var sheet = workbook.Sheets[this.options.sheet ? this.options.sheet : workbook.SheetNames[0]];
  var range = XLSX.utils.decode_range(sheet['!ref']);
  var filters = {};

  if (this.options.columns) {
    // If we are only displaying certain columns, we will only load those into
    // memory for performance purposes. However, we also need to include
    // columns used for sorting, filtering, row processors, and custom queries.
    var columns = this.options.columns
      .concat(
        this.options.sortby.map(function (v) { return Array.isArray(v) ? v[0] : v; }),
        this.options.filters.map(function (v) { return v.col; }),
        Object.keys(this.options.query),
        Object.values(this.options.row_processors).reduce(function (acc, cur) { return acc.concat(Array.isArray(cur) ? cur : []) }, [])
        )
      .sort()
      .filter(function (v, i, a) { return v != a[i - 1]; });
  }
  else {
    var columns = new Array(range.e.c - range.s.c);

    for (var i = range.s.c; i <= range.e.c; ++i) {
      output.push(XLSX.utils.encode_col(i));
    }
  }

  for (var i = 0; i < this.options.filters.length; ++i) {
    var col = 'col' + this.options.filters[i].col;
    filters[col] = this.db.addCollection(col, { unique: ['value'] });
    this.items.ensureIndex(this.options.filters[i].col);
  }

  columns.map(function (col) {
    this.headers[col] = this.options.column_labels[col] ? this.options.column_labels[col] : sheet[col + "1"].v;
  }, this);

  for (var i = 2; i <= range.e.r + 1; ++i) {
    var row = {};
    columns.map(function (col) { row[col] = sheet[col + i] ? sheet[col + i].v : null; })
    for (var j = 0; j < this.options.filters.length; ++j) {
      var col = this.options.filters[j].col;
      row[col] && (filters['col' + col].by('value', row[col]) || filters['col' + col].insert({ value: row[col] }));
    }
    this.items.insert(row);
  }

  return this;
}

EmbedSheetData.prototype.pagedQuery = function (conditions, page) {
  var rows_per_page = this.options.rows_per_page;
  var data = this.items.chain().find(conditions).compoundsort(this.options.sortby);
  var total_rows = data.count();
  var max_pages = rows_per_page ? Math.floor(total_rows / rows_per_page) : 0;
  page = parseInt(max_pages < page ? max_pages : page);

  if (rows_per_page) {
    data = data.offset(page * rows_per_page).limit(rows_per_page);
  }

  return {
    total: total_rows,
    page: page,
    max_pages: max_pages,
    data: data.data()
  };
}

/**
 * Returns object of information needed to build filters:
 *    label: Column name
 *    choices: All column values for select list
 */
EmbedSheetData.prototype.getFilter = function (col) {
  return {
    label: this.headers[col],
    choices: this.db.getCollection('col' + col)
  };
}

/**
 * Fetches the given URL and initializes the data store.
 *    url: URL to fetch
 *    options: object of options to pass to EmbedSheetData
 *    complete: callback function to be invoked on success. It is passed an
 *        instance of EmbedSheetData.
 */
EmbedSheetData.fromURL = function (url, options, complete) {
  if (typeof FileReader === 'undefined') return;

  var reader = new FileReader();
  reader.onload = function (e) {
    var data = new Uint8Array(e.target.result);
    var datastore = new EmbedSheetData(data, options);

    complete(datastore);
  };

  fetch(url)
    .then(function (response) { return response.blob(); })
    .then(function (file) { reader.readAsArrayBuffer(file); })
    .catch(function (err) { console.log(err); });
}