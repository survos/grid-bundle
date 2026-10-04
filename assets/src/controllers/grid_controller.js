import { Controller } from "@hotwired/stimulus";
import DataTable from "datatables.net-bs5";
import { loadExtensions, loadLanguage } from "../extensions.js";
import "datatables.net-bs5/css/dataTables.bootstrap5.css";
import "../datatables-tabler.css";

// Shared lifecycle for plain tables and API-grid's server-side adapter.
/* stimulusFetch: 'lazy' */
export class GridController extends Controller {
  static targets = ["table"];
  static values = {
    useDatatables: { type: Boolean, default: true },
    search: { type: Boolean, default: true },
    info: { type: Boolean, default: false },
    dom: { type: String, default: "lfrtip" },
    pageLength: { type: Number, default: 20 },
    scrollY: { type: String, default: "" },
    remoteUrl: { type: String, default: "" },
    columns: { type: Array, default: [] },
    extensions: { type: Array, default: [] },
    options: { type: Object, default: {} },
    locale: { type: String, default: "" },
  };

  get DataTable() { return DataTable; }

  beginConnection() {
    this.disconnect();
    this.connection = new AbortController();
    return this.connection.signal;
  }

  async connect() {
    const signal = this.beginConnection();
    if (!this.useDatatablesValue || !this.hasTableTarget) return;
    try {
      await this.prepareTableAssets(this.extensionsValue, this.localeValue);
      if (signal.aborted) return;
      let options = this.tableOptions();
      if (this.remoteUrlValue) {
        const response = await fetch(this.remoteUrlValue, { signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${this.remoteUrlValue}`);
        const data = await response.json();
        options = this.tableOptions({
          data: Array.isArray(data) ? data : (data.member ?? data["hydra:member"] ?? []),
          columns: this.columnsValue.map(({ name, title, sortable, searchable, ...rest }) => ({
            data: name, title,
            ...(sortable === undefined ? {} : { orderable: sortable }),
            ...(searchable === undefined ? {} : { searchable }),
            ...rest,
          })),
        });
      }
      if (!signal.aborted) this.createTable(this.tableTarget, options);
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  }

  disconnect() {
    this.connection?.abort();
    this.dt?.destroy();
    this.dt = null;
  }

  async prepareTableAssets(extensions = [], locale = "") {
    const [, language] = await Promise.all([loadExtensions(extensions), loadLanguage(locale)]);
    this.language = language;
  }

  // Subclasses prepare their options, then use the same construction and teardown.
  createTable(element, options) {
    const prepared = this.beforeInit(options) ?? options;
    this.dt = new this.DataTable(element, prepared);
    this.afterInit(this.dt);
    return this.dt;
  }

  beforeInit(options) { return options; }
  afterInit(table) {}

  tableOptions(extra = {}) {
    const options = {
      dom: this.domValue,
      searching: this.searchValue,
      info: this.infoValue,
      pageLength: this.pageLengthValue,
      scrollY: this.scrollYValue || undefined,
      scrollCollapse: !!this.scrollYValue,
      ...(this.language ? { language: this.language } : {}),
      ...this.optionsValue,
      ...extra,
    };
    // A modern layout takes precedence over the legacy dom preset.
    if (options.layout) delete options.dom;
    return options;
  }
}

export default GridController;
