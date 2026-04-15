import React from 'react';
import './ChatInterface.css';

const quickActions = ['Create Expense', 'View Expenses', 'Modify Expense', 'Delete Expense', 'Analytics'];
const cardTypes = ['Debit Card', 'Credit Card'];
const categories = ['Transport', 'Shopping', 'Food'];
const chartColors = ['#c06b37', '#2d483f', '#d8a25e', '#8f2f21', '#6c5845'];

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderExpenseList(expenses) {
  if (!expenses?.length) return null;

  return (
    <div className="content-card">
      <div className="card-title">Expenses</div>
      <div className="expense-table-wrap">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Category</th>
              <th>Card</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id || expense._id || expense.label}>
                <td>{expense.date}</td>
                <td>{expense.full_name}</td>
                <td>{expense.category}</td>
                <td>{expense.card_type}</td>
                <td>{expense.description}</td>
                <td>Rs {Number(expense.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, 'Z'].join(' ');
}

function renderExpensePieChart(expenses) {
  if (!expenses?.length) return null;

  const grouped = expenses.reduce((accumulator, expense) => {
    accumulator[expense.category] = (accumulator[expense.category] || 0) + Number(expense.amount);
    return accumulator;
  }, {});

  const entries = Object.entries(grouped);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

  if (!total) return null;

  let startAngle = 0;
  const slices = entries.map(([label, amount], index) => {
    const angle = (amount / total) * 360;
    const endAngle = startAngle + angle;
    const slice = {
      label,
      amount,
      color: chartColors[index % chartColors.length],
      path: describeArc(80, 80, 70, startAngle, endAngle),
      percentage: ((amount / total) * 100).toFixed(1),
    };
    startAngle = endAngle;
    return slice;
  });

  return (
    <div className="content-card">
      <div className="card-title">Expense Breakdown</div>
      <div className="pie-chart-layout">
        <svg className="pie-chart" viewBox="0 0 160 160" aria-label="Expense pie chart">
          {slices.map((slice) => (
            <path key={slice.label} d={slice.path} fill={slice.color} stroke="#fffdf8" strokeWidth="2" />
          ))}
          <circle cx="80" cy="80" r="30" fill="#fff8ef" />
          <text x="80" y="76" textAnchor="middle" className="pie-chart-total-label">Total</text>
          <text x="80" y="92" textAnchor="middle" className="pie-chart-total-value">
            {Math.round(total)}
          </text>
        </svg>

        <div className="pie-chart-legend">
          {slices.map((slice) => (
            <div className="legend-item" key={slice.label}>
              <span className="legend-swatch" style={{ backgroundColor: slice.color }} />
              <div>
                <strong>{slice.label}</strong>
                <span>Rs {slice.amount.toFixed(2)} · {slice.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderConfirmation(confirmation) {
  if (!confirmation) return null;
  const expense = confirmation.expense;

  return (
    <div className="content-card">
      <div className="card-title">
        {confirmation.type === 'create' && 'Save Expense'}
        {confirmation.type === 'update' && 'Updated Expense'}
        {confirmation.type === 'delete' && 'Deleted Expense'}
      </div>
      {expense && (
        <div className="detail-grid">
          {Object.entries(expense).map(([key, value]) => (
            <div className="detail-item" key={key}>
              <span>{key.replace(/_/g, ' ')}</span>
              <strong>{String(value)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderAnalytics(analytics) {
  if (!analytics) return null;
  const categoryEntries = Object.entries(analytics.spendingByCategory || {});

  return (
    <div className="content-card">
      <div className="analytics-hero">
        <div>
          <span className="eyebrow">This Month</span>
          <h3>Rs {Number(analytics.totalThisMonth || 0).toFixed(2)}</h3>
        </div>
        <p>Total spending across all tracked categories.</p>
      </div>

      <div className="analytics-categories">
        {categoryEntries.length === 0 && <span>No category spending yet this month.</span>}
        {categoryEntries.map(([category, amount]) => (
          <div className="analytics-chip" key={category}>
            <span>{category}</span>
            <strong>Rs {Number(amount).toFixed(2)}</strong>
          </div>
        ))}
      </div>

      {renderExpenseList(analytics.lastTransactions)}
    </div>
  );
}

function MessageBubble({ message, onQuickAction }) {
  const payload = message.payload || {};
  const menuOptions = payload.menuOptions || [];

  return (
    <div className={`message ${message.type === 'user' ? 'message-user' : 'message-bot'}`}>
      <div className="bubble">
        <div className="message-text">{message.text}</div>
        {payload.alert && <div className={`alert-banner alert-${payload.alert.type}`}>{payload.alert.message}</div>}
        {renderConfirmation(payload.confirmation)}
        {renderExpensePieChart(payload.expenses)}
        {renderExpenseList(payload.expenses)}
        {renderAnalytics(payload.analytics)}
        {menuOptions.length > 0 && (
          <div className="quick-action-wrap">
            {menuOptions.map((action) => (
              <button key={action} type="button" className="quick-pill" onClick={() => onQuickAction(action)}>
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="message-time">{formatTime(message.timestamp)}</span>
    </div>
  );
}

function ExpenseFields({ form, errors, onChange, disabled }) {
  const showHighExpenseHint = Number(form.amount || 0) > 5000;

  return (
    <div className="expense-form-grid">
      <label className="form-field">
        <span>Full Name</span>
        <input type="text" value={form.full_name} onChange={(event) => onChange('full_name', event.target.value)} disabled={disabled} />
        {errors.full_name && <small>{errors.full_name}</small>}
      </label>

      <label className="form-field">
        <span>Card Type</span>
        <select value={form.card_type} onChange={(event) => onChange('card_type', event.target.value)} disabled={disabled}>
          {cardTypes.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {errors.card_type && <small>{errors.card_type}</small>}
      </label>

      <label className="form-field">
        <span>Category</span>
        <select value={form.category} onChange={(event) => onChange('category', event.target.value)} disabled={disabled}>
          {categories.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {errors.category && <small>{errors.category}</small>}
      </label>

      <label className="form-field">
        <span>Amount</span>
        <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => onChange('amount', event.target.value)} disabled={disabled} />
        {errors.amount && <small>{errors.amount}</small>}
        {showHighExpenseHint && <small className="warning-text">This expense is above Rs 5000 and will trigger a notification.</small>}
      </label>

      <label className="form-field form-field-wide">
        <span>Description</span>
        <input type="text" value={form.description} onChange={(event) => onChange('description', event.target.value)} disabled={disabled} />
        {errors.description && <small>{errors.description}</small>}
      </label>

      <label className="form-field">
        <span>Date</span>
        <input type="text" placeholder="15-04-2026" value={form.date} onChange={(event) => onChange('date', event.target.value)} disabled={disabled} />
        {errors.date && <small>{errors.date}</small>}
      </label>

      <label className="form-field">
        <span>Contact Number</span>
        <input type="text" placeholder="+919876543210" value={form.contact_number} onChange={(event) => onChange('contact_number', event.target.value)} disabled={disabled} />
        {errors.contact_number && <small>{errors.contact_number}</small>}
      </label>

      <label className="form-field form-field-wide">
        <span>Email</span>
        <input type="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} disabled={disabled} />
        {errors.email && <small>{errors.email}</small>}
      </label>
    </div>
  );
}

function ExpenseSelector({ items, selectedId, onSelect, danger }) {
  if (!items?.length) {
    return <div className="empty-state">No expenses found yet.</div>;
  }

  return (
    <div className="selector-list">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`selector-item ${selectedId === item.id ? 'selector-item-active' : ''} ${danger ? 'selector-item-danger' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          <strong>{item.date} | {item.category}</strong>
          <span>{item.description}</span>
          <em>Rs {Number(item.amount).toFixed(2)}</em>
        </button>
      ))}
    </div>
  );
}

function ActionPanel({
  actionState,
  onActionFieldChange,
  onActionFormChange,
  onAnalyticsSubmit,
  onCloseActionPanel,
  onCreateSubmit,
  onDeleteSubmit,
  onExpenseSelect,
  onModifySubmit,
}) {
  if (!actionState.mode) return null;

  const { analytics, errors, form, items, loading, mobile, mode, selectedId } = actionState;

  return (
    <div className="expense-form-card">
      <div className="expense-form-header">
        <div>
          <span className="eyebrow">Direct Action</span>
          <h3>
            {mode === 'create' && 'Create Expense'}
            {mode === 'view' && 'View Expenses'}
            {mode === 'modify' && 'Modify Expense'}
            {mode === 'delete' && 'Delete Expense'}
            {mode === 'analytics' && 'Analytics'}
          </h3>
        </div>
        <button type="button" className="form-close-button" onClick={onCloseActionPanel}>Close</button>
      </div>

      {mode === 'create' && (
        <form onSubmit={onCreateSubmit}>
          <ExpenseFields form={form} errors={errors} onChange={onActionFormChange} disabled={loading} />
          {errors.submit && <div className="panel-error">{errors.submit}</div>}
          <div className="expense-form-actions">
            <button type="submit" className="primary-button" disabled={loading}>{loading ? 'Saving...' : 'Save Expense'}</button>
          </div>
        </form>
      )}

      {mode === 'view' && (
        loading ? <div className="empty-state">Loading saved expenses...</div> : (items.length > 0 ? <>{renderExpensePieChart(items)}{renderExpenseList(items)}</> : <div className="empty-state">No saved expenses found.</div>)
      )}

      {mode === 'modify' && (
        loading ? <div className="empty-state">Loading saved expenses...</div> : (
          items.length > 0 ? (
            <>
              <div className="panel-subtitle">Select an expense to edit</div>
              <ExpenseSelector items={items} selectedId={selectedId} onSelect={onExpenseSelect} />
              {errors.selectedId && <div className="panel-error">{errors.selectedId}</div>}
              {selectedId && (
                <form onSubmit={onModifySubmit}>
                  <ExpenseFields form={form} errors={errors} onChange={onActionFormChange} disabled={loading} />
                  {errors.submit && <div className="panel-error">{errors.submit}</div>}
                  <div className="expense-form-actions">
                    <button type="submit" className="primary-button" disabled={loading}>{loading ? 'Updating...' : 'Update Expense'}</button>
                  </div>
                </form>
              )}
            </>
          ) : <div className="empty-state">No saved expenses found.</div>
        )
      )}

      {mode === 'delete' && (
        loading ? <div className="empty-state">Loading saved expenses...</div> : (
          items.length > 0 ? (
            <>
              <div className="panel-subtitle">Select an expense to delete</div>
              <ExpenseSelector items={items} selectedId={selectedId} onSelect={onExpenseSelect} danger />
              {errors.selectedId && <div className="panel-error">{errors.selectedId}</div>}
              {errors.submit && <div className="panel-error">{errors.submit}</div>}
              <div className="expense-form-actions">
                <button type="button" className="danger-button" disabled={loading || !selectedId} onClick={onDeleteSubmit}>
                  {loading ? 'Deleting...' : 'Delete Selected Expense'}
                </button>
              </div>
            </>
          ) : <div className="empty-state">No saved expenses found.</div>
        )
      )}

      {mode === 'analytics' && (
        <form className="lookup-form" onSubmit={onAnalyticsSubmit}>
          <label className="form-field form-field-wide">
            <span>Contact Number</span>
            <input type="text" placeholder="+919876543210" value={mobile} onChange={(event) => onActionFieldChange('mobile', event.target.value)} disabled={loading} />
            {errors.mobile && <small>{errors.mobile}</small>}
          </label>
          <button type="submit" className="primary-button" disabled={loading}>{loading ? 'Loading...' : 'Load Analytics'}</button>
          {analytics && renderAnalytics(analytics)}
        </form>
      )}
    </div>
  );
}

function ChatInterface({
  actionState,
  input,
  loading,
  messages,
  messagesEndRef,
  onActionFieldChange,
  onActionFormChange,
  onAnalyticsSubmit,
  onCloseActionPanel,
  onCreateSubmit,
  onDeleteSubmit,
  onExpenseSelect,
  onInputChange,
  onModifySubmit,
  onQuickAction,
  onReset,
  onSubmit,
}) {
  return (
    <main className="chat-page">
      <aside className="info-panel">
        <div className="panel-card hero-card">
          <span className="eyebrow">Expense Workspace</span>
          <h1>Personal Finance Tracker</h1>
          <p>Use direct forms for create, view, modify, delete, and analytics. The chat box stays available only for general assistant help.</p>
        </div>

        <div className="panel-card">
          <div className="section-title">Quick Actions</div>
          <div className="action-grid">
            {quickActions.map((action) => (
              <button key={action} type="button" className="action-button" onClick={() => onQuickAction(action)} disabled={loading}>
                {action}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-card compact-card">
          <div className="section-title">Validation Rules</div>
          <ul>
            <li>Full name must include first and last name.</li>
            <li>Card type must be Debit Card or Credit Card.</li>
            <li>Categories: Transport, Shopping, Food.</li>
            <li>Date format must be DD-MM-YYYY.</li>
            <li>Phone format: country code + 10 digits.</li>
          </ul>
        </div>
      </aside>

      <section className="chat-panel">
        <header className="chat-header">
          <div>
            <span className="eyebrow">Direct Management</span>
            <h2>Expenses</h2>
          </div>
          <button type="button" className="reset-button" onClick={onReset} disabled={loading}>Reset</button>
        </header>

        <ActionPanel
          actionState={actionState}
          onActionFieldChange={onActionFieldChange}
          onActionFormChange={onActionFormChange}
          onAnalyticsSubmit={onAnalyticsSubmit}
          onCloseActionPanel={onCloseActionPanel}
          onCreateSubmit={onCreateSubmit}
          onDeleteSubmit={onDeleteSubmit}
          onExpenseSelect={onExpenseSelect}
          onModifySubmit={onModifySubmit}
        />

        <div className="message-stream">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} onQuickAction={onQuickAction} />
          ))}

          {loading && (
            <div className="message message-bot">
              <div className="bubble typing-bubble">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <input
            className="composer-input"
            type="text"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Optional assistant chat for help or FAQs"
            disabled={loading}
          />
          <button className="send-button" type="submit" disabled={loading || !input.trim()}>Send</button>
        </form>
      </section>
    </main>
  );
}

export default ChatInterface;
