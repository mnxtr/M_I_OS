
import { DatabaseZap, Sparkles, Upload } from 'lucide-react';
import { FormEvent } from "react";

import { QueryResult, TableInfo } from "@/lib/api";
import { Lang, t } from "@/lib/i18n";

interface AnalyticsPanelProps {
  tables: TableInfo[];
  query: string;
  result: QueryResult | null;
  busy: boolean;
  error: string;
  lang: Lang;
  onQueryChange: (query: string) => void;
  onRun: (event: FormEvent<HTMLFormElement>) => void;
  onUpload: () => void;
}

export default function AnalyticsPanel({
  tables,
  query,
  result,
  busy,
  error,
  lang,
  onQueryChange,
  onRun,
  onUpload,
}: AnalyticsPanelProps) {
  const tr = t(lang);
  const totalRows = tables.reduce((total, table) => total + table.row_count, 0);

  return (
    <div className="workspace-view analytics-view">
      <section className="view-intro">
        <div>
          <p className="eyebrow">{tr.analyticsEyebrow}</p>
          <h1>{tr.analyticsTitle}</h1>
          <p>{tr.analyticsIntro}</p>
        </div>
        <div className="data-summary">
          <strong>{tables.length}</strong>
          <span>
            {tr.dataTables} · {totalRows} {tr.rows}
          </span>
        </div>
      </section>

      <div className="analytics-layout">
        <aside className="section-card data-catalog">
          <div className="section-heading">
            <p className="eyebrow">{tr.availableData}</p>
            <h2>{tr.sourceLibrary}</h2>
          </div>
          {tables.length > 0 ? (
            <div className="table-list">
              {tables.map((table) => (
                <article className="table-card" key={table.id}>
                  <div>
                    <strong>{table.name}</strong>
                    <span>
                      {table.row_count} {tr.rows} · {table.columns.length} {tr.columns}
                    </span>
                  </div>
                  <div className="column-list">
                    {table.columns.slice(0, 5).map((column) => (
                      <span key={column.name}>{column.name}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty-state">
              <span className="empty-index" aria-hidden="true"><DatabaseZap size={20} /></span>
              <h3>{tr.noTablesTitle}</h3>
              <p>{tr.noTablesCopy}</p>
              <button className="btn btn-secondary" onClick={onUpload}>
                <Upload aria-hidden="true" size={15} />
                {tr.uploadDoc}
              </button>
            </div>
          )}
        </aside>

        <section className="section-card query-workbench">
          <div className="section-heading">
            <p className="eyebrow">{tr.queryYourData}</p>
            <h2>{tr.analyticsTitle}</h2>
          </div>
          <form className="analytics-form" onSubmit={onRun}>
            <label htmlFor="analytics-query" className="sr-only">
              {tr.analyticsPlaceholder}
            </label>
            <textarea
              id="analytics-query"
              className="textarea"
              rows={3}
              placeholder={tr.analyticsPlaceholder}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              disabled={tables.length === 0}
            />
            <button className="btn btn-primary" disabled={busy || !query.trim() || tables.length === 0}>
              <Sparkles aria-hidden="true" size={16} />
              {busy ? tr.pleaseWait : tr.run}
            </button>
          </form>

          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="analysis-result">
              <div className="result-heading">
                <div>
                  <p className="eyebrow">{tr.analysisResult}</p>
                  <h3>{result.answer}</h3>
                </div>
                <span className="count-badge">{tr.rowsReturned(result.row_count)}</span>
              </div>

              {result.rows.length > 0 ? (
                <div className="table-scroll">
                  <table className="result-table">
                    <thead>
                      <tr>
                        {result.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 20).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {result.columns.map((column) => (
                            <td key={column}>{String(row[column] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <details className="sql-details">
                <summary>{tr.generatedSql}</summary>
                <pre>{result.sql}</pre>
              </details>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
