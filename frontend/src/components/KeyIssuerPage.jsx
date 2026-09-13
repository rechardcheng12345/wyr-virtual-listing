import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { formatSingaporeDateTime } from '../utils/dateTime';

const DEFAULT_EXPIRY_YEARS = 50;

// Today + DEFAULT_EXPIRY_YEARS as yyyyMMdd (Feb 29 rolls to Mar 1 in non-leap years)
function defaultExpiryDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + DEFAULT_EXPIRY_YEARS);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}${mm}${dd}`;
}

function createInitialForm() {
  return {
    company: '',
    invoice: '',
    hardwareId: '',
    expiryDate: defaultExpiryDate(),
  };
}

const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconCopy = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// yyyyMMdd <-> yyyy-MM-dd (the format <input type="date"> requires)
function yyyymmddToDateInput(value) {
  if (!/^\d{8}$/.test(value)) return '';
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function dateInputToYyyymmdd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return value.replaceAll('-', '');
}

export default function KeyIssuerPage({ user, showToast }) {
  const dateInputRef = useRef(null);
  const openDatePicker = () => {
    try {
      dateInputRef.current?.showPicker?.();
    } catch {
      // showPicker() isn't supported in every browser (e.g. Safari/Firefox) — the
      // calendar icon button still opens it directly via its own native input.
    }
  };

  const [form, setForm] = useState(createInitialForm);
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState('');
  const [lastIssued, setLastIssued] = useState(null);

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('');

  const fetchKeys = useCallback(async (company = '', invoice = '') => {
    setLoading(true);
    setListError('');
    try {
      const { data } = await axios.get('/api/key-issuer', {
        params: { company, invoice },
      });
      setKeys(data);
    } catch {
      setListError('Failed to load issued keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchKeys(companyFilter, invoiceFilter);
  };

  const handleClearSearch = () => {
    setCompanyFilter('');
    setInvoiceFilter('');
    fetchKeys();
  };

  const validateForm = () => {
    if (!form.company.trim() || !form.invoice.trim()) {
      return 'Company and Invoice No are required.';
    }
    if (!/^\d{8}$/.test(form.expiryDate)) {
      return 'Expiry Date must be 8 digits in yyyyMMdd format.';
    }
    if (!/^[0-9a-fA-F]+$/.test(form.hardwareId) || form.hardwareId.length % 2 !== 0) {
      return 'Hardware ID must be a hex string with an even number of characters.';
    }
    return '';
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError('');
    setGenerating(true);
    try {
      const { data } = await axios.post('/api/key-issuer/generate', {
        ...form,
        issuedBy: user?.username,
      });
      setLastIssued(data);
      setKeys((prev) => [data, ...prev]);
      setForm(createInitialForm());
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to generate key.');
    } finally {
      setGenerating(false);
    }
  };

  const handleClear = () => {
    setForm(createInitialForm());
    setFormError('');
    setLastIssued(null);
  };

  const handleDownload = (id) => {
    window.open(`/api/key-issuer/${id}/download`, '_blank');
  };

  const handleCopy = async (outputKey) => {
    try {
      await navigator.clipboard.writeText(outputKey);
      showToast?.('Output key copied to clipboard.');
    } catch {
      showToast?.('Failed to copy output key.', 'error');
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Key Issuer</h2>
          <p>Generate hardware-locked license keys and review everything issued so far.</p>
        </div>
      </div>

      <div className="table-wrapper" style={{ padding: 20, marginBottom: 20 }}>
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {formError && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label>Company *</label>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Company ABC"
              />
            </div>
            <div className="form-group">
              <label>Invoice No *</label>
              <input
                value={form.invoice}
                onChange={(e) => setForm({ ...form, invoice: e.target.value })}
                placeholder="e.g. P0001"
              />
            </div>
            <div className="form-group">
              <label>Hardware ID *</label>
              <input
                value={form.hardwareId}
                onChange={(e) => setForm({ ...form, hardwareId: e.target.value.trim() })}
                placeholder="e.g. 10dc297f"
              />
            </div>
            <div className="form-group">
              <label>Expiry Date * <span className="muted-text" style={{ fontWeight: 400 }}>(yyyyMMdd)</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value.trim() })}
                  onFocus={openDatePicker}
                  onClick={openDatePicker}
                  placeholder="e.g. 20381111"
                  maxLength={8}
                  style={{ flex: 1 }}
                />
                <div
                  style={{
                    position: 'relative',
                    width: 40,
                    flex: '0 0 40px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                  title="Pick a date"
                >
                  <IconCalendar />
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={yyyymmddToDateInput(form.expiryDate)}
                    onChange={(e) => setForm({ ...form, expiryDate: dateInputToYyyymmdd(e.target.value) })}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {lastIssued && (
            <div className="form-group">
              <label>Output Key</label>
              <input value={lastIssued.output_key} readOnly style={{ fontFamily: 'monospace' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={generating}>
              {generating ? 'Generating…' : 'Generate'}
            </button>
            {lastIssued && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleDownload(lastIssued.id)}
              >
                Download .dc file
              </button>
            )}
            {lastIssued && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCopy(lastIssued.output_key)}
              >
                <IconCopy />
                Copy
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={generating}>
              Clear
            </button>
          </div>
        </form>
      </div>

      <form className="listing-toolbar" onSubmit={handleSearch} style={{ gap: 10, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        <label className="search-field" style={{ width: 220 }}>
          <span>Company</span>
          <input
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            placeholder="Filter by company"
          />
        </label>
        <label className="search-field" style={{ width: 220 }}>
          <span>Invoice</span>
          <input
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value)}
            placeholder="Filter by invoice"
          />
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 1 }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '9px 16px' }}>Search</button>
          <button type="button" className="btn btn-secondary" style={{ padding: '9px 16px' }} onClick={handleClearSearch}>
            Reset
          </button>
        </div>
      </form>

      <div className="table-wrapper">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : listError ? (
          <div style={{ padding: '24px', color: '#ef4444' }}>{listError}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Invoice</th>
                <th>Hardware ID</th>
                <th>Expiry Date</th>
                <th>Output Key</th>
                <th>Issued By</th>
                <th>Issued At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={8}>No keys issued yet.</td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.company}</td>
                    <td>{k.invoice}</td>
                    <td>{k.hardware_id}</td>
                    <td>{k.expiry_date}</td>
                    <td style={{ fontFamily: 'monospace' }}>{k.output_key}</td>
                    <td>{k.issued_by ?? '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatSingaporeDateTime(k.issued_at)}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleDownload(k.id)}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
