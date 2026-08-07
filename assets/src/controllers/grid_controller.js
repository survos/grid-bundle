import { Controller } from "@hotwired/stimulus";
import DataTable from "datatables.net-bs5";

import "datatables.net-bs5/css/dataTables.bootstrap5.css";

// The "basics" table controller: renders a plain in-memory (or single-fetch)
// DataTable, no ApiPlatform/AJAX-per-page, no facets. Exported as a named
// class so survos/api-grid-bundle can `extends GridController` instead of
// duplicating table setup.
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
  };

  connect() {
    if (!this.useDatatablesValue || !this.hasTableTarget) {
      return;
    }
    if (this.remoteUrlValue) {
      this.#connectRemote();
    } else {
      this.dt = new DataTable(this.tableTarget, this.tableOptions());
    }
  }

  disconnect() {
    this.dt?.destroy();
    this.dt = null;
  }

  // shared DataTable options, independent of where the rows come from
  tableOptions(extra = {}) {
    return {
      dom: this.domValue,
      searching: this.searchValue,
      info: this.infoValue,
      pageLength: this.pageLengthValue,
      scrollY: this.scrollYValue || undefined,
      scrollCollapse: !!this.scrollYValue,
      ...extra,
    };
  }

  #connectRemote() {
    fetch(this.remoteUrlValue)
      .then((response) => response.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : (data.member ?? data["hydra:member"] ?? []);
        this.dt = new DataTable(
          this.tableTarget,
          this.tableOptions({
            data: rows,
            columns: this.columnsValue.map((c) => ({ data: c.name, title: c.title })),
          })
        );
      })
      .catch((error) => {
        console.error(`[grid] failed to load ${this.remoteUrlValue}`, error);
      });
  }
}

export default GridController;
