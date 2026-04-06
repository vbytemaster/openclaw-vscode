export const tableStyles = `
  .msg.assistant table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--fg) 10%, transparent);
    border-radius: 8px;
    overflow: hidden;
  }
  .msg.assistant th,
  .msg.assistant td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
  }
  .msg.assistant th {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--muted);
    font-weight: 700;
    background: color-mix(in srgb, var(--fg) 3%, transparent);
  }
  .msg.assistant tr:last-child td { border-bottom: none; }
  .oc-table-card { margin-top: 6px; }
  .oc-table-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
  .oc-table-title { font-size: 12px; font-weight: 600; color: color-mix(in srgb, var(--fg) 88%, transparent); }
  .oc-table-wrap { overflow-x: auto; border: none; border-radius: 0; background: transparent; }
  .oc-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 0;
    table-layout: fixed;
  }
  .oc-table th,
  .oc-table td {
    padding: 8px 6px;
    text-align: left;
    vertical-align: top;
    border-bottom: 1px solid color-mix(in srgb, var(--fg) 6%, transparent);
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .oc-table th {
    position: static;
    background: color-mix(in srgb, var(--fg) 1%, transparent);
    z-index: 1;
    font-size: 10.5px;
    text-transform: none;
    letter-spacing: 0;
    color: color-mix(in srgb, var(--fg) 78%, transparent);
    font-weight: 650;
  }
  .oc-table td {
    font-size: 10.5px;
    line-height: 1.4;
    color: color-mix(in srgb, var(--fg) 74%, transparent);
  }
  .oc-table tbody tr:nth-child(even) { background: transparent; }
  .oc-table tr:last-child td { border-bottom: none; }
`;
