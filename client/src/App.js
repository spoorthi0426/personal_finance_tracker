import React, { useEffect, useRef, useState } from 'react';
import ChatInterface from './components/ChatInterface';
import {
  createExpense,
  deleteExpense,
  fetchAnalytics,
  fetchExpensesByMobile,
  getMenu,
  resetConversation,
  sendChatMessage,
  updateExpense,
} from './services/api';
import './App.css';

const initialExpenseForm = {
  full_name: '',
  card_type: 'Debit Card',
  category: 'Transport',
  amount: '',
  description: '',
  date: '',
  contact_number: '',
  email: '',
};

const initialActionState = {
  mode: null,
  loading: false,
  mobile: '',
  items: [],
  selectedId: '',
  form: initialExpenseForm,
  errors: {},
  analytics: null,
};

function isHighExpense(amount) {
  return Number(amount) > 5000;
}

function buildHighExpenseMessage(expense, actionLabel) {
  return {
    id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'bot',
    text: `High expense alert: this ${actionLabel} expense is above Rs 5000.`,
    payload: {
      confirmation: {
        type: 'create',
        expense,
      },
      alert: {
        type: 'warning',
        message: `Amount ${expense.amount} is above the Rs 5000 threshold.`,
      },
    },
    timestamp: new Date().toISOString(),
  };
}

function normalizeExpense(expense) {
  return {
    full_name: expense.full_name,
    card_type: expense.card_type,
    category: expense.category,
    amount: String(expense.amount),
    description: expense.description,
    date: expense.date,
    contact_number: expense.contact_number,
    email: expense.email,
  };
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [actionState, setActionState] = useState(initialActionState);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const generatedId = `session_${Date.now()}`;
    setSessionId(generatedId);

    async function loadMenu() {
      const response = await getMenu();
      setMessages([
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: response.menu.text,
          payload: response.menu,
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    loadMenu().catch(() => {
      setMessages([
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: 'Unable to load the assistant menu right now.',
          timestamp: new Date().toISOString(),
        },
      ]);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, actionState]);

  async function handleSend(messageText) {
    const trimmed = messageText.trim();
    if (!trimmed || loading) return;

    setMessages((current) => [
      ...current,
      {
        id: `user_${Date.now()}`,
        type: 'user',
        text: trimmed,
        timestamp: new Date().toISOString(),
      },
    ]);
    setLoading(true);

    try {
      const response = await sendChatMessage({ message: trimmed, sessionId });
      setSessionId(response.sessionId);
      setMessages((current) => [
        ...current,
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: response.reply.text,
          payload: response.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: error.response?.data?.error || 'The assistant could not process your message.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!sessionId || loading) return;
    setLoading(true);
    setActionState(initialActionState);

    try {
      const response = await resetConversation(sessionId);
      setSessionId(response.sessionId);
      setMessages([
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: response.reply.text,
          payload: response.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: 'Unable to reset the conversation right now.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleSend(input);
    setInput('');
  }

  function setActionMode(mode) {
    setActionState({
      ...initialActionState,
      mode,
      form: initialExpenseForm,
    });
  }

  async function loadAllExpensesForMode(mode) {
    setActionState({
      ...initialActionState,
      mode,
      loading: true,
      form: initialExpenseForm,
    });

    try {
      const response = await fetchExpensesByMobile('');
      setActionState((current) => ({
        ...current,
        loading: false,
        items: response.data,
      }));
    } catch (error) {
      setActionState((current) => ({
        ...current,
        loading: false,
        errors: {
          submit: error.response?.data?.error || 'Unable to load expenses.',
        },
      }));
    }
  }

  function handleQuickAction(action) {
    if (action === 'Create Expense') return setActionMode('create');
    if (action === 'View Expenses') return loadAllExpensesForMode('view');
    if (action === 'Modify Expense') return loadAllExpensesForMode('modify');
    if (action === 'Delete Expense') return loadAllExpensesForMode('delete');
    if (action === 'Analytics') return setActionMode('analytics');

    handleSend(action);
  }

  function closeActionPanel() {
    setActionState(initialActionState);
  }

  function updateActionField(field, value) {
    setActionState((current) => ({
      ...current,
      [field]: value,
      errors: {
        ...current.errors,
        [field]: '',
      },
    }));
  }

  function updateActionFormField(field, value) {
    setActionState((current) => ({
      ...current,
      form: {
        ...current.form,
        [field]: value,
      },
      errors: {
        ...current.errors,
        [field]: '',
      },
    }));
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    setActionState((current) => ({ ...current, loading: true, errors: {} }));

    try {
      const response = await createExpense({
        ...actionState.form,
        amount: Number(actionState.form.amount),
      });

      setMessages((current) => [
        ...current,
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: 'Expense created successfully.',
          payload: {
            confirmation: {
              type: 'create',
              expense: response.data,
            },
          },
          timestamp: new Date().toISOString(),
        },
        ...(isHighExpense(response.data.amount)
          ? [buildHighExpenseMessage(response.data, 'created')]
          : []),
      ]);
      setActionState(initialActionState);
    } catch (error) {
      setActionState((current) => ({
        ...current,
        loading: false,
        errors: error.response?.data?.fieldErrors || {
          submit: error.response?.data?.error || 'Unable to create the expense.',
        },
      }));
    }
  }

  async function handleSearchExpenses(event) {
    event.preventDefault();
    setActionState((current) => ({
      ...current,
      loading: true,
      items: [],
      selectedId: '',
      analytics: null,
      errors: {},
      form: initialExpenseForm,
    }));

    try {
      const response = await fetchExpensesByMobile(actionState.mobile);
      setActionState((current) => ({
        ...current,
        loading: false,
        items: response.data,
      }));
    } catch (error) {
      setActionState((current) => ({
        ...current,
        loading: false,
        errors: {
          mobile: error.response?.data?.error || 'Unable to fetch expenses.',
        },
      }));
    }
  }

  function handleSelectExpense(id) {
    const selected = actionState.items.find((item) => item.id === id);
    setActionState((current) => ({
      ...current,
      selectedId: id,
      form: selected ? normalizeExpense(selected) : initialExpenseForm,
      errors: {
        ...current.errors,
        selectedId: '',
        submit: '',
      },
    }));
  }

  async function handleModifySubmit(event) {
    event.preventDefault();
    if (!actionState.selectedId) {
      setActionState((current) => ({
        ...current,
        errors: { ...current.errors, selectedId: 'Select an expense to modify.' },
      }));
      return;
    }

    setActionState((current) => ({ ...current, loading: true, errors: {} }));

    try {
      const response = await updateExpense(actionState.selectedId, {
        ...actionState.form,
        amount: Number(actionState.form.amount),
      });

      setActionState((current) => ({
        ...current,
        loading: false,
        items: current.items.map((item) => (item.id === current.selectedId ? response.data : item)),
        form: normalizeExpense(response.data),
      }));

      setMessages((current) => [
        ...current,
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: 'Expense updated successfully.',
          payload: {
            confirmation: {
              type: 'update',
              expense: response.data,
            },
          },
          timestamp: new Date().toISOString(),
        },
        ...(isHighExpense(response.data.amount)
          ? [buildHighExpenseMessage(response.data, 'updated')]
          : []),
      ]);
    } catch (error) {
      setActionState((current) => ({
        ...current,
        loading: false,
        errors: error.response?.data?.fieldErrors || {
          submit: error.response?.data?.error || 'Unable to update the expense.',
        },
      }));
    }
  }

  async function handleDeleteSubmit() {
    if (!actionState.selectedId) {
      setActionState((current) => ({
        ...current,
        errors: { ...current.errors, selectedId: 'Select an expense to delete.' },
      }));
      return;
    }

    setActionState((current) => ({ ...current, loading: true, errors: {} }));

    try {
      await deleteExpense(actionState.selectedId);
      const deletedExpense = actionState.items.find((item) => item.id === actionState.selectedId);

      setActionState((current) => ({
        ...current,
        loading: false,
        items: current.items.filter((item) => item.id !== current.selectedId),
        selectedId: '',
        form: initialExpenseForm,
      }));

      setMessages((current) => [
        ...current,
        {
          id: `bot_${Date.now()}`,
          type: 'bot',
          text: 'Expense deleted successfully.',
          payload: deletedExpense
            ? {
                confirmation: {
                  type: 'delete',
                  expense: deletedExpense,
                },
              }
            : undefined,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setActionState((current) => ({
        ...current,
        loading: false,
        errors: {
          ...current.errors,
          submit: error.response?.data?.error || 'Unable to delete the expense.',
        },
      }));
    }
  }

  async function handleAnalyticsSubmit(event) {
    event.preventDefault();
    setActionState((current) => ({
      ...current,
      loading: true,
      analytics: null,
      errors: {},
    }));

    try {
      const response = await fetchAnalytics(actionState.mobile);
      setActionState((current) => ({
        ...current,
        loading: false,
        analytics: response.data,
      }));
    } catch (error) {
      setActionState((current) => ({
        ...current,
        loading: false,
        errors: {
          mobile: error.response?.data?.error || 'Unable to load analytics.',
        },
      }));
    }
  }

  return (
    <div className="app-shell">
      <ChatInterface
        actionState={actionState}
        input={input}
        loading={loading}
        messages={messages}
        messagesEndRef={messagesEndRef}
        onActionFieldChange={updateActionField}
        onActionFormChange={updateActionFormField}
        onAnalyticsSubmit={handleAnalyticsSubmit}
        onCloseActionPanel={closeActionPanel}
        onCreateSubmit={handleCreateSubmit}
        onDeleteSubmit={handleDeleteSubmit}
        onExpenseSelect={handleSelectExpense}
        onInputChange={setInput}
        onModifySubmit={handleModifySubmit}
        onQuickAction={handleQuickAction}
        onReset={handleReset}
        onSearchExpenses={handleSearchExpenses}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default App;
